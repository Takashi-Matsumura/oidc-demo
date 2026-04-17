import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionJwt } from "@/app/lib/jwt-utils";
import { discoverProvider, fetchUserInfo } from "@/app/lib/oidc-client";
import {
  resolveProvider,
  type ProviderKey,
} from "@/app/lib/client-providers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("oidc_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sessionSecret =
    process.env.SESSION_SECRET ||
    "development-secret-change-me-in-production";
  const session = await verifySessionJwt(sessionToken, sessionSecret);

  if (!session || !session.access_token) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const providerKey = ((session.provider as string) ?? "google") as ProviderKey;
  const provider = resolveProvider(providerKey);

  try {
    const discovery = await discoverProvider(provider.issuer);
    const userInfo = await fetchUserInfo(
      discovery.userinfo_endpoint,
      session.access_token as string,
    );
    return NextResponse.json(userInfo);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
