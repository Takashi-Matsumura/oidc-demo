// OIDC Discovery Document (RFC 8414)
export type OIDCDiscoveryDocument = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  grant_types_supported?: string[];
  subject_types_supported?: string[];
  id_token_signing_alg_values_supported: string[];
  claims_supported?: string[];
};

// Token Endpoint のレスポンス
export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
  scope?: string;
};

// デコード済み ID Token のペイロード
export type IDTokenPayload = {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  [key: string]: unknown;
};

// UserInfo Endpoint のレスポンス
export type UserInfoResponse = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  [key: string]: unknown;
};

// フローイベント（各HTTPリクエスト/レスポンスの記録）
export type FlowEvent = {
  id: string;
  timestamp: number;
  step: string;
  direction: "outgoing" | "incoming";
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  response?: {
    status: number;
    headers?: Record<string, string>;
    body: string;
  };
  explanation: string;
  // どのレイヤーが発生させたイベントか（client=RP 側、provider=OP 側）
  actor?: "client" | "provider";
};

// Provider 側: 登録されたクライアント
export type ProviderClient = {
  client_id: string;
  client_secret: string;
  client_name: string;
  redirect_uris: string[];
  created_at: number;
};

// Provider 側: テストユーザー
export type ProviderUser = {
  sub: string;
  username: string;
  password: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
};

// Provider 側: 発行済み認可コード（短命、一度だけ使える）
export type AuthorizationCode = {
  code: string;
  client_id: string;
  redirect_uri: string;
  scope: string;
  nonce?: string;
  user_sub: string;
  code_challenge: string;
  code_challenge_method: "S256";
  issued_at: number;
  used: boolean;
};

// Provider 側: 発行済み Access Token
export type ProviderAccessToken = {
  token: string;
  client_id: string;
  user_sub: string;
  scope: string;
  issued_at: number;
  expires_at: number;
};

// セッションに保存するユーザー情報
export type SessionUser = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: string;
};

// フローイベントのAPI レスポンス
export type FlowLogResponse = {
  events: FlowEvent[];
};
