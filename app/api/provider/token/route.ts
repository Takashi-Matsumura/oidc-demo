import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  consumeAuthorizationCode,
  getClient,
  getUserBySub,
  issueAccessToken,
  issueIdToken,
  PROVIDER_ISSUER,
} from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

function err(status: number, error: string, description?: string) {
  return NextResponse.json(
    description ? { error, error_description: description } : { error },
    { status },
  );
}

function verifyPkce(verifier: string, challenge: string): boolean {
  const hash = createHash("sha256").update(verifier).digest();
  return hash.toString("base64url") === challenge;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const grant_type = String(form.get("grant_type") ?? "");
  const code = String(form.get("code") ?? "");
  const redirect_uri = String(form.get("redirect_uri") ?? "");
  const client_id = String(form.get("client_id") ?? "");
  const client_secret = String(form.get("client_secret") ?? "");
  const code_verifier = String(form.get("code_verifier") ?? "");

  addFlowEvent({
    actor: "provider",
    step: "token_request",
    direction: "incoming",
    method: "POST",
    url: `${PROVIDER_ISSUER}/token`,
    body: `grant_type=${grant_type}&code=[AUTHORIZATION_CODE]&client_id=${client_id}&redirect_uri=${redirect_uri}`,
    explanation:
      "クライアントから Token リクエストを受信しました。client 認証、code 検証、PKCE 検証を行います。",
  });

  if (grant_type !== "authorization_code") {
    return err(400, "unsupported_grant_type");
  }

  const client = getClient(client_id);
  if (!client || client.client_secret !== client_secret) {
    return err(401, "invalid_client", "client_id または client_secret が不正");
  }

  const record = consumeAuthorizationCode(code);
  if (!record) {
    return err(400, "invalid_grant", "認可コードが不正または期限切れ");
  }

  if (record.client_id !== client_id) {
    return err(400, "invalid_grant", "認可コードが別のクライアント宛");
  }

  if (record.redirect_uri !== redirect_uri) {
    return err(400, "invalid_grant", "redirect_uri が一致しません");
  }

  if (!verifyPkce(code_verifier, record.code_challenge)) {
    return err(400, "invalid_grant", "PKCE verifier と challenge が一致しません");
  }

  const user = getUserBySub(record.user_sub);
  if (!user) {
    return err(500, "server_error", "ユーザーが見つかりません");
  }

  // Access Token を発行し、続けて at_hash 込みの ID Token に署名
  const access = issueAccessToken({
    client_id,
    user_sub: user.sub,
    scope: record.scope,
  });
  const idToken = await issueIdToken({
    client_id,
    user,
    nonce: record.nonce,
    access_token: access.token,
    scope: record.scope,
  });

  const body = {
    access_token: access.token,
    token_type: "Bearer",
    expires_in: Math.floor((access.expires_at - access.issued_at) / 1000),
    id_token: idToken,
    scope: record.scope,
  };

  addFlowEvent({
    actor: "provider",
    step: "token_response",
    direction: "outgoing",
    method: "POST",
    url: `${PROVIDER_ISSUER}/token`,
    response: {
      status: 200,
      body: JSON.stringify(
        {
          ...body,
          access_token: `${body.access_token.slice(0, 20)}...[truncated]`,
          id_token: `${body.id_token.slice(0, 40)}...[truncated]`,
        },
        null,
        2,
      ),
    },
    explanation:
      "Access Token と ID Token を発行しました。ID Token は RS256 で署名され、at_hash を含みます。",
  });

  return NextResponse.json(body);
}
