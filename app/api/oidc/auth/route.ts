import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { discoverProvider, buildAuthorizationUrl } from "@/app/lib/oidc-client";
import {
  generateState,
  generateNonce,
  generateCodeVerifier,
  generateCodeChallenge,
} from "@/app/lib/crypto-utils";
import { clearFlowEvents } from "@/app/lib/flow-store";
import {
  resolveProvider,
  type ProviderKey,
} from "@/app/lib/client-providers";

export async function GET(request: NextRequest) {
  const providerKey = (request.nextUrl.searchParams.get("provider") ??
    "google") as ProviderKey;
  const provider = resolveProvider(providerKey);

  if (!provider.clientId) {
    return NextResponse.json(
      {
        error: `Provider "${provider.key}" の client_id が未設定です`,
      },
      { status: 500 },
    );
  }

  // 新しいフローを開始するので、前のログをクリア
  clearFlowEvents();

  const discovery = await discoverProvider(provider.issuer);

  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/oidc/callback`;
  const authUrl = buildAuthorizationUrl({
    authorizationEndpoint: discovery.authorization_endpoint,
    clientId: provider.clientId,
    redirectUri,
    scopes: provider.scopes,
    state,
    nonce,
    codeChallenge,
  });

  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  cookieStore.set("oidc_state", state, cookieOptions);
  cookieStore.set("oidc_nonce", nonce, cookieOptions);
  cookieStore.set("oidc_code_verifier", codeVerifier, cookieOptions);
  cookieStore.set("oidc_provider", provider.key, cookieOptions);

  return NextResponse.redirect(authUrl);
}
