import { NextResponse } from "next/server";
import { getKeyMaterial, PROVIDER_ISSUER } from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

export async function GET() {
  const { publicJwk } = await getKeyMaterial();
  const body = { keys: [publicJwk] };

  addFlowEvent({
    actor: "provider",
    step: "jwks",
    direction: "incoming",
    method: "GET",
    url: `${PROVIDER_ISSUER}/jwks`,
    response: { status: 200, body: JSON.stringify(body, null, 2) },
    explanation:
      "JWKS エンドポイントが公開鍵を返しました。クライアントはこの公開鍵で ID Token の RS256 署名を検証します。",
  });

  return NextResponse.json(body);
}
