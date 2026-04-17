import { NextRequest, NextResponse } from "next/server";
import {
  authenticateUser,
  deletePendingRequest,
  getPendingRequest,
  issueAuthorizationCode,
  PROVIDER_ISSUER,
} from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

type ConsentBody = {
  request_id?: string;
  username?: string;
  password?: string;
  action?: "approve" | "deny";
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as ConsentBody;
  const requestId = body.request_id ?? "";
  const pending = getPendingRequest(requestId);
  if (!pending) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "unknown request_id" },
      { status: 400 },
    );
  }

  if (body.action === "deny") {
    deletePendingRequest(pending.id);
    const url = new URL(pending.redirect_uri);
    url.searchParams.set("error", "access_denied");
    url.searchParams.set("state", pending.state);
    addFlowEvent({
      actor: "provider",
      step: "consent_denied",
      direction: "outgoing",
      method: "GET",
      url: url.toString(),
      explanation:
        "ユーザーが同意を拒否しました。RP の redirect_uri に error=access_denied を付けて戻します。",
    });
    return NextResponse.json({ redirect: url.toString() });
  }

  const user = authenticateUser(body.username ?? "", body.password ?? "");
  if (!user) {
    addFlowEvent({
      actor: "provider",
      step: "consent_auth_failed",
      direction: "incoming",
      method: "POST",
      url: `${PROVIDER_ISSUER}/consent`,
      explanation: "ユーザー認証に失敗しました（ユーザー名またはパスワードが不正）。",
    });
    return NextResponse.json(
      { error: "ユーザー名またはパスワードが正しくありません" },
      { status: 401 },
    );
  }

  // 認可コード発行
  const authCode = issueAuthorizationCode({
    client_id: pending.client_id,
    redirect_uri: pending.redirect_uri,
    scope: pending.scope,
    nonce: pending.nonce,
    user_sub: user.sub,
    code_challenge: pending.code_challenge,
    code_challenge_method: pending.code_challenge_method,
  });
  deletePendingRequest(pending.id);

  const url = new URL(pending.redirect_uri);
  url.searchParams.set("code", authCode.code);
  url.searchParams.set("state", pending.state);
  url.searchParams.set("iss", PROVIDER_ISSUER);

  addFlowEvent({
    actor: "provider",
    step: "authorization_code_issued",
    direction: "outgoing",
    method: "GET",
    url: url.toString().replace(/code=[^&]+/, "code=[AUTHORIZATION_CODE]"),
    explanation: `ユーザー "${user.username}" (sub=${user.sub}) の認可コードを発行し、RP の redirect_uri に戻します。`,
  });

  return NextResponse.json({ redirect: url.toString() });
}
