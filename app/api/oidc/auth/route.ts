import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { discoverProvider, buildAuthorizationUrl } from "@/app/lib/oidc-client";
import {
  generateState,
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
} from "@/app/lib/crypto-utils";
import { clearFlowEvents } from "@/app/lib/flow-store";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured" },
      { status: 500 },
    );
  }

  // 新しいフローを開始するので、前のログをクリア
  clearFlowEvents();

  // Step 1: Discovery Document を取得
  const issuer = "https://accounts.google.com";
  const discovery = await discoverProvider(issuer);

  // Step 2: PKCE、state、nonce を生成
  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Step 3: 認可URLを構築
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oidc/callback`;
  const authUrl = buildAuthorizationUrl({
    authorizationEndpoint: discovery.authorization_endpoint,
    clientId,
    redirectUri,
    scopes: ["openid", "profile", "email"],
    state,
    nonce,
    codeChallenge,
  });

  // Step 4: state, nonce, code_verifier を cookie に保存（短命）
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600, // 10分
    path: "/",
  };

  cookieStore.set("oidc_state", state, cookieOptions);
  cookieStore.set("oidc_nonce", nonce, cookieOptions);
  cookieStore.set("oidc_code_verifier", codeVerifier, cookieOptions);

  // Step 5: Google の認可エンドポイントにリダイレクト
  return NextResponse.redirect(authUrl);
}
