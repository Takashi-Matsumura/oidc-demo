import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { discoverProvider, exchangeCodeForTokens } from "@/app/lib/oidc-client";
import { verifyIdToken, decodeJwt, createSessionJwt } from "@/app/lib/jwt-utils";
import { addFlowEvent } from "@/app/lib/flow-store";
import {
  resolveProvider,
  type ProviderKey,
} from "@/app/lib/client-providers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // エラーチェック
  if (error) {
    const description = searchParams.get("error_description") || "Unknown error";
    return NextResponse.redirect(
      new URL(`/client/callback?error=${encodeURIComponent(description)}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/client/callback?error=Missing+code+or+state", request.url),
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oidc_state")?.value;
  const savedNonce = cookieStore.get("oidc_nonce")?.value;
  const codeVerifier = cookieStore.get("oidc_code_verifier")?.value;

  // State 検証（CSRF防止）
  if (state !== savedState) {
    addFlowEvent({
      step: "state_validation",
      direction: "incoming",
      method: "GET",
      url: request.url,
      explanation: `state が一致しません。CSRF攻撃の可能性があります。expected: ${savedState}, got: ${state}`,
    });
    return NextResponse.redirect(
      new URL("/client/callback?error=State+mismatch", request.url),
    );
  }

  addFlowEvent({
    step: "callback_received",
    direction: "incoming",
    method: "GET",
    url: request.url.replace(/code=[^&]+/, "code=[AUTHORIZATION_CODE]"),
    explanation:
      "OIDC Provider から認可コードを受け取りました。state パラメータの検証に成功しました。",
  });

  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL("/client/callback?error=Missing+code_verifier", request.url),
    );
  }

  // 認可フロー開始時に保存した provider を参照
  const providerKey = (cookieStore.get("oidc_provider")?.value ??
    "google") as ProviderKey;
  const provider = resolveProvider(providerKey);

  const discovery = await discoverProvider(provider.issuer);

  const clientId = provider.clientId;
  const clientSecret = provider.clientSecret;
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oidc/callback`;

  try {
    // 認可コードをトークンに交換
    const tokenResponse = await exchangeCodeForTokens({
      tokenEndpoint: discovery.token_endpoint,
      code,
      clientId,
      clientSecret,
      redirectUri,
      codeVerifier,
    });

    // ID Token を検証
    const idTokenPayload = await verifyIdToken(
      tokenResponse.id_token,
      discovery,
      clientId,
      savedNonce,
    );

    addFlowEvent({
      step: "id_token_verified",
      direction: "incoming",
      method: "POST",
      url: discovery.token_endpoint,
      explanation: `ID Token の検証に成功しました。署名検証（JWKS）、iss="${idTokenPayload.iss}"、aud="${idTokenPayload.aud}"、exp、nonce すべてOKです。`,
    });

    // デコード済みトークンをセッションデータとして保存
    const { header } = decodeJwt(tokenResponse.id_token);

    const sessionData = {
      sub: idTokenPayload.sub,
      email: idTokenPayload.email,
      name: idTokenPayload.name,
      picture: idTokenPayload.picture,
      provider: provider.key,
      // 表示用に生トークン情報も保存
      raw_id_token: tokenResponse.id_token,
      id_token_header: header,
      id_token_payload: idTokenPayload,
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type,
      expires_in: tokenResponse.expires_in,
    };

    const sessionSecret = process.env.SESSION_SECRET || "development-secret-change-me-in-production";
    const sessionJwt = await createSessionJwt(sessionData, sessionSecret);

    // OIDC 用 cookie をクリア
    cookieStore.delete("oidc_state");
    cookieStore.delete("oidc_nonce");
    cookieStore.delete("oidc_code_verifier");
    cookieStore.delete("oidc_provider");

    // セッション cookie をセット
    cookieStore.set("oidc_session", sessionJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8時間
      path: "/",
    });

    return NextResponse.redirect(new URL("/client/callback", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    addFlowEvent({
      step: "error",
      direction: "incoming",
      method: "POST",
      url: discovery.token_endpoint,
      explanation: `エラーが発生しました: ${message}`,
    });
    return NextResponse.redirect(
      new URL(`/client/callback?error=${encodeURIComponent(message)}`, request.url),
    );
  }
}
