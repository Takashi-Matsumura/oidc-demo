import type {
  OIDCDiscoveryDocument,
  TokenResponse,
  UserInfoResponse,
} from "./types";
import { addFlowEvent } from "./flow-store";

// Discovery Document のキャッシュ
const discoveryCache = new Map<
  string,
  { doc: OIDCDiscoveryDocument; fetchedAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5分

// Discovery Document を取得（.well-known/openid-configuration）
export async function discoverProvider(
  issuer: string,
): Promise<OIDCDiscoveryDocument> {
  const cached = discoveryCache.get(issuer);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.doc;
  }

  const url = issuer.endsWith("/")
    ? `${issuer}.well-known/openid-configuration`
    : `${issuer}/.well-known/openid-configuration`;

  addFlowEvent({
    step: "discovery",
    direction: "outgoing",
    method: "GET",
    url,
    explanation:
      "OIDC Provider の Discovery Document を取得します。ここにすべてのエンドポイントURLが記載されています。",
  });

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Discovery fetch failed: ${res.status} ${res.statusText}`);
  }

  const doc: OIDCDiscoveryDocument = await res.json();

  addFlowEvent({
    step: "discovery",
    direction: "incoming",
    method: "GET",
    url,
    response: {
      status: res.status,
      body: JSON.stringify(doc, null, 2),
    },
    explanation:
      "Discovery Document を受信しました。authorization_endpoint, token_endpoint, jwks_uri などが含まれています。",
  });

  discoveryCache.set(issuer, { doc, fetchedAt: Date.now() });
  return doc;
}

// 認可URLを構築
export function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("state", params.state);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  addFlowEvent({
    step: "authorization_redirect",
    direction: "outgoing",
    method: "GET",
    url: url.toString(),
    explanation:
      "ユーザーを OIDC Provider の認可エンドポイントにリダイレクトします。state（CSRF防止）、nonce（リプレイ防止）、PKCE code_challenge を含みます。",
  });

  return url.toString();
}

// 認可コードをトークンに交換
export async function exchangeCodeForTokens(params: {
  tokenEndpoint: string;
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  addFlowEvent({
    step: "token_exchange",
    direction: "outgoing",
    method: "POST",
    url: params.tokenEndpoint,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString().replace(params.clientSecret, "[REDACTED]"),
    explanation:
      "認可コードをトークンエンドポイントに送信して、ID Token と Access Token に交換します。PKCE code_verifier も送信して、認可リクエストの送信元と同一であることを証明します。",
  });

  const res = await fetch(params.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${error}`);
  }

  const tokenResponse: TokenResponse = await res.json();

  addFlowEvent({
    step: "token_exchange",
    direction: "incoming",
    method: "POST",
    url: params.tokenEndpoint,
    response: {
      status: res.status,
      body: JSON.stringify(
        {
          ...tokenResponse,
          access_token:
            tokenResponse.access_token.slice(0, 20) + "...[truncated]",
        },
        null,
        2,
      ),
    },
    explanation:
      "トークンレスポンスを受信しました。id_token（JWT形式のIDトークン）、access_token（UserInfo取得用）、token_type、expires_in が含まれます。",
  });

  return tokenResponse;
}

// UserInfo エンドポイントを呼び出し
export async function fetchUserInfo(
  userInfoEndpoint: string,
  accessToken: string,
): Promise<UserInfoResponse> {
  addFlowEvent({
    step: "userinfo",
    direction: "outgoing",
    method: "GET",
    url: userInfoEndpoint,
    headers: { Authorization: "Bearer [ACCESS_TOKEN]" },
    explanation:
      "Access Token を使って UserInfo エンドポイントを呼び出します。Bearer トークンとして Authorization ヘッダーに含めます。",
  });

  const res = await fetch(userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`UserInfo fetch failed: ${res.status}`);
  }

  const userInfo: UserInfoResponse = await res.json();

  addFlowEvent({
    step: "userinfo",
    direction: "incoming",
    method: "GET",
    url: userInfoEndpoint,
    response: {
      status: res.status,
      body: JSON.stringify(userInfo, null, 2),
    },
    explanation:
      "UserInfo レスポンスを受信しました。ID Token のクレームと同様のユーザー情報が含まれますが、こちらは常に最新の情報です。",
  });

  return userInfo;
}
