import { NextRequest, NextResponse } from "next/server";
import {
  getClient,
  savePendingRequest,
  PROVIDER_ISSUER,
} from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

// RP からのリダイレクトでの redirect_uri ベースのエラー返却
function redirectWithError(
  redirectUri: string,
  error: string,
  description: string,
  state?: string,
) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const response_type = p.get("response_type") ?? "";
  const client_id = p.get("client_id") ?? "";
  const redirect_uri = p.get("redirect_uri") ?? "";
  const scope = p.get("scope") ?? "";
  const state = p.get("state") ?? "";
  const nonce = p.get("nonce") ?? undefined;
  const code_challenge = p.get("code_challenge") ?? "";
  const code_challenge_method = p.get("code_challenge_method") ?? "";

  addFlowEvent({
    actor: "provider",
    step: "authorization_request",
    direction: "incoming",
    method: "GET",
    url: request.url,
    explanation:
      "クライアントから認可リクエストを受信しました。パラメータを検証し、ユーザーを同意画面にリダイレクトします。",
  });

  // client_id 検証
  const client = getClient(client_id);
  if (!client) {
    return NextResponse.json(
      { error: "invalid_client", error_description: `unknown client_id: ${client_id}` },
      { status: 400 },
    );
  }

  // redirect_uri 検証（登録されたものと完全一致）
  if (!client.redirect_uris.includes(redirect_uri)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "redirect_uri mismatch" },
      { status: 400 },
    );
  }

  // これ以降は redirect_uri 経由でエラーを返せる
  if (response_type !== "code") {
    return redirectWithError(
      redirect_uri,
      "unsupported_response_type",
      `response_type=${response_type} はサポートされていません`,
      state,
    );
  }

  if (!scope.split(/\s+/).includes("openid")) {
    return redirectWithError(
      redirect_uri,
      "invalid_scope",
      "scope に openid が必要です",
      state,
    );
  }

  if (!code_challenge || code_challenge_method !== "S256") {
    return redirectWithError(
      redirect_uri,
      "invalid_request",
      "PKCE (code_challenge + S256) が必要です",
      state,
    );
  }

  // 認可リクエストを一時保存して同意画面へ
  const pending = savePendingRequest({
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    nonce,
    code_challenge,
    code_challenge_method: "S256",
  });

  const consentUrl = new URL("/provider/consent", request.url);
  consentUrl.searchParams.set("req", pending.id);

  addFlowEvent({
    actor: "provider",
    step: "consent_redirect",
    direction: "outgoing",
    method: "GET",
    url: consentUrl.toString(),
    explanation: `認可リクエストを一時保存 (id=${pending.id}) し、同意画面 /provider/consent にリダイレクトします。`,
  });

  void PROVIDER_ISSUER;
  return NextResponse.redirect(consentUrl);
}
