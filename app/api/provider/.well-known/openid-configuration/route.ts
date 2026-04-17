import { NextResponse } from "next/server";
import { PROVIDER_ISSUER } from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

export async function GET() {
  const doc = {
    issuer: PROVIDER_ISSUER,
    authorization_endpoint: `${PROVIDER_ISSUER}/authorize`,
    token_endpoint: `${PROVIDER_ISSUER}/token`,
    userinfo_endpoint: `${PROVIDER_ISSUER}/userinfo`,
    jwks_uri: `${PROVIDER_ISSUER}/jwks`,
    registration_endpoint: `${PROVIDER_ISSUER}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    claims_supported: [
      "sub",
      "iss",
      "aud",
      "exp",
      "iat",
      "nonce",
      "at_hash",
      "name",
      "given_name",
      "family_name",
      "email",
      "email_verified",
      "picture",
    ],
    code_challenge_methods_supported: ["S256"],
  };

  addFlowEvent({
    actor: "provider",
    step: "discovery",
    direction: "incoming",
    method: "GET",
    url: `${PROVIDER_ISSUER}/.well-known/openid-configuration`,
    response: { status: 200, body: JSON.stringify(doc, null, 2) },
    explanation:
      "Local Provider の Discovery Document を返しました。クライアントはこれを起点に各エンドポイントを把握します。",
  });

  return NextResponse.json(doc);
}
