import { NextRequest, NextResponse } from "next/server";
import {
  getAccessToken,
  getUserBySub,
  PROVIDER_ISSUER,
} from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

export async function GET(request: NextRequest) {
  const authz = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authz);

  addFlowEvent({
    actor: "provider",
    step: "userinfo_request",
    direction: "incoming",
    method: "GET",
    url: `${PROVIDER_ISSUER}/userinfo`,
    headers: { authorization: match ? "Bearer [ACCESS_TOKEN]" : "(none)" },
    explanation:
      "UserInfo リクエストを受信しました。Authorization ヘッダの Bearer トークンを検証します。",
  });

  if (!match) {
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const record = getAccessToken(match[1]);
  if (!record) {
    return NextResponse.json(
      { error: "invalid_token", error_description: "Access Token が不正または期限切れ" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  const user = getUserBySub(record.user_sub);
  if (!user) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const scopes = record.scope.split(/\s+/);
  const claims: Record<string, unknown> = { sub: user.sub };
  if (scopes.includes("profile")) {
    claims.name = user.name;
    claims.given_name = user.given_name;
    claims.family_name = user.family_name;
    if (user.picture) claims.picture = user.picture;
  }
  if (scopes.includes("email")) {
    claims.email = user.email;
    claims.email_verified = user.email_verified;
  }

  addFlowEvent({
    actor: "provider",
    step: "userinfo_response",
    direction: "outgoing",
    method: "GET",
    url: `${PROVIDER_ISSUER}/userinfo`,
    response: { status: 200, body: JSON.stringify(claims, null, 2) },
    explanation: `Access Token に紐づくユーザー (sub=${user.sub}) の claims を返しました。`,
  });

  return NextResponse.json(claims);
}
