import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionJwt } from "@/app/lib/jwt-utils";

export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("oidc_session")?.value;

  if (!sessionToken) {
    return NextResponse.json({ authenticated: false });
  }

  const sessionSecret =
    process.env.SESSION_SECRET ||
    "development-secret-change-me-in-production";
  const session = await verifySessionJwt(sessionToken, sessionSecret);

  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      sub: session.sub,
      email: session.email,
      name: session.name,
      picture: session.picture,
      provider: session.provider,
    },
    tokens: {
      raw_id_token: session.raw_id_token,
      id_token_header: session.id_token_header,
      id_token_payload: session.id_token_payload,
      access_token: session.access_token
        ? String(session.access_token).slice(0, 20) + "...[truncated]"
        : null,
      token_type: session.token_type,
      expires_in: session.expires_in,
    },
  });
}
