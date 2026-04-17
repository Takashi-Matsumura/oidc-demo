import * as jose from "jose";
import { createHash, randomBytes } from "crypto";
import type {
  AuthorizationCode,
  ProviderAccessToken,
  ProviderClient,
  ProviderUser,
} from "./types";

// Provider の発行者 URL。ポート 3000 固定（デモ用）
export const PROVIDER_ISSUER = "http://localhost:3000/api/provider";

// ID Token の有効期限（秒）
const ID_TOKEN_TTL_SECONDS = 3600;
// Access Token の有効期限（秒）
const ACCESS_TOKEN_TTL_SECONDS = 3600;
// 認可コードの有効期限（秒）
const AUTH_CODE_TTL_SECONDS = 120;

// ---- 鍵ペア（サーバー起動ごとに生成） ----

type KeyMaterial = {
  privateKey: jose.CryptoKey;
  publicJwk: jose.JWK;
  kid: string;
};

let keyMaterialPromise: Promise<KeyMaterial> | null = null;

export function getKeyMaterial(): Promise<KeyMaterial> {
  if (!keyMaterialPromise) {
    keyMaterialPromise = (async () => {
      const { privateKey, publicKey } = await jose.generateKeyPair("RS256", {
        modulusLength: 2048,
        extractable: true,
      });
      const publicJwk = await jose.exportJWK(publicKey);
      const kid = createHash("sha256")
        .update(JSON.stringify(publicJwk))
        .digest("base64url")
        .slice(0, 32);
      return {
        privateKey,
        publicJwk: { ...publicJwk, kid, alg: "RS256", use: "sig" },
        kid,
      };
    })();
  }
  return keyMaterialPromise;
}

// ---- クライアントレジストリ（インメモリ） ----

const clients = new Map<string, ProviderClient>();

// 初期クライアント（Phase 1 の Client UI からすぐ試せるように）
export const DEFAULT_LOCAL_CLIENT: ProviderClient = {
  client_id: "local-demo-client",
  client_secret: "local-demo-secret",
  client_name: "OIDC Demo Local Client",
  redirect_uris: ["http://localhost:3000/api/oidc/callback"],
  created_at: Date.now(),
};
clients.set(DEFAULT_LOCAL_CLIENT.client_id, DEFAULT_LOCAL_CLIENT);

export function registerClient(input: {
  client_name: string;
  redirect_uris: string[];
}): ProviderClient {
  const client: ProviderClient = {
    client_id: `client-${randomBytes(6).toString("hex")}`,
    client_secret: randomBytes(24).toString("base64url"),
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
    created_at: Date.now(),
  };
  clients.set(client.client_id, client);
  return client;
}

export function getClient(clientId: string): ProviderClient | undefined {
  return clients.get(clientId);
}

export function listClients(): ProviderClient[] {
  return Array.from(clients.values());
}

// ---- テストユーザー ----

const users = new Map<string, ProviderUser>();

const seedUsers: ProviderUser[] = [
  {
    sub: "user-001",
    username: "alice",
    password: "password",
    email: "alice@example.com",
    email_verified: true,
    name: "Alice Anderson",
    given_name: "Alice",
    family_name: "Anderson",
  },
  {
    sub: "user-002",
    username: "bob",
    password: "password",
    email: "bob@example.com",
    email_verified: true,
    name: "Bob Brown",
    given_name: "Bob",
    family_name: "Brown",
  },
  {
    sub: "user-003",
    username: "carol",
    password: "password",
    email: "carol@example.com",
    email_verified: false,
    name: "Carol Chen",
    given_name: "Carol",
    family_name: "Chen",
  },
];
for (const u of seedUsers) users.set(u.sub, u);

export function listUsers(): ProviderUser[] {
  return Array.from(users.values());
}

export function getUserBySub(sub: string): ProviderUser | undefined {
  return users.get(sub);
}

export function authenticateUser(
  username: string,
  password: string,
): ProviderUser | null {
  for (const u of users.values()) {
    if (u.username === username && u.password === password) return u;
  }
  return null;
}

// ---- 認可コードストア ----

const authCodes = new Map<string, AuthorizationCode>();

export function issueAuthorizationCode(params: {
  client_id: string;
  redirect_uri: string;
  scope: string;
  nonce?: string;
  user_sub: string;
  code_challenge: string;
  code_challenge_method: "S256";
}): AuthorizationCode {
  const code = randomBytes(24).toString("base64url");
  const record: AuthorizationCode = {
    code,
    ...params,
    issued_at: Date.now(),
    used: false,
  };
  authCodes.set(code, record);
  return record;
}

export function consumeAuthorizationCode(
  code: string,
): AuthorizationCode | null {
  const record = authCodes.get(code);
  if (!record) return null;
  if (record.used) return null;
  if (Date.now() - record.issued_at > AUTH_CODE_TTL_SECONDS * 1000) return null;
  record.used = true;
  authCodes.set(code, record);
  return record;
}

// ---- Access Token ストア ----

const accessTokens = new Map<string, ProviderAccessToken>();

export function issueAccessToken(params: {
  client_id: string;
  user_sub: string;
  scope: string;
}): ProviderAccessToken {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  const record: ProviderAccessToken = {
    token,
    client_id: params.client_id,
    user_sub: params.user_sub,
    scope: params.scope,
    issued_at: now,
    expires_at: now + ACCESS_TOKEN_TTL_SECONDS * 1000,
  };
  accessTokens.set(token, record);
  return record;
}

export function getAccessToken(
  token: string,
): ProviderAccessToken | undefined {
  const record = accessTokens.get(token);
  if (!record) return undefined;
  if (Date.now() > record.expires_at) return undefined;
  return record;
}

// ---- ID Token 発行 ----

export async function issueIdToken(params: {
  client_id: string;
  user: ProviderUser;
  nonce?: string;
  access_token: string;
  scope: string;
}): Promise<string> {
  const { privateKey, kid } = await getKeyMaterial();

  // at_hash: access_token の SHA-256 を左半分、base64url エンコード
  const atHashBuf = createHash("sha256").update(params.access_token).digest();
  const atHash = atHashBuf
    .subarray(0, atHashBuf.length / 2)
    .toString("base64url");

  const scopes = params.scope.split(/\s+/);
  const claims: Record<string, unknown> = {
    iss: PROVIDER_ISSUER,
    sub: params.user.sub,
    aud: params.client_id,
    at_hash: atHash,
  };
  if (params.nonce) claims.nonce = params.nonce;
  if (scopes.includes("profile")) {
    claims.name = params.user.name;
    claims.given_name = params.user.given_name;
    claims.family_name = params.user.family_name;
    if (params.user.picture) claims.picture = params.user.picture;
  }
  if (scopes.includes("email")) {
    claims.email = params.user.email;
    claims.email_verified = params.user.email_verified;
  }

  return new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid })
    .setIssuedAt()
    .setExpirationTime(`${ID_TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);
}

// ---- 認可リクエストの一時保存（同意画面へ渡す） ----

export type PendingAuthorizationRequest = {
  id: string;
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  state: string;
  nonce?: string;
  code_challenge: string;
  code_challenge_method: "S256";
  created_at: number;
};

const pendingRequests = new Map<string, PendingAuthorizationRequest>();

export function savePendingRequest(
  req: Omit<PendingAuthorizationRequest, "id" | "created_at">,
): PendingAuthorizationRequest {
  const id = randomBytes(12).toString("base64url");
  const record: PendingAuthorizationRequest = {
    ...req,
    id,
    created_at: Date.now(),
  };
  pendingRequests.set(id, record);
  return record;
}

export function getPendingRequest(
  id: string,
): PendingAuthorizationRequest | undefined {
  return pendingRequests.get(id);
}

export function deletePendingRequest(id: string): void {
  pendingRequests.delete(id);
}
