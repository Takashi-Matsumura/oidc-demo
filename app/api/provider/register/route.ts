import { NextRequest, NextResponse } from "next/server";
import { registerClient, PROVIDER_ISSUER } from "@/app/lib/oidc-provider";
import { addFlowEvent } from "@/app/lib/flow-store";

export async function POST(request: NextRequest) {
  let input: { client_name?: string; redirect_uris?: string[] };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (!input.client_name || !Array.isArray(input.redirect_uris)) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "client_name と redirect_uris は必須" },
      { status: 400 },
    );
  }

  const client = registerClient({
    client_name: input.client_name,
    redirect_uris: input.redirect_uris,
  });

  addFlowEvent({
    actor: "provider",
    step: "client_registration",
    direction: "incoming",
    method: "POST",
    url: `${PROVIDER_ISSUER}/register`,
    response: { status: 201, body: JSON.stringify(client, null, 2) },
    explanation: `新しいクライアント "${client.client_name}" を登録しました。client_id と client_secret が発行されます。`,
  });

  return NextResponse.json(client, { status: 201 });
}
