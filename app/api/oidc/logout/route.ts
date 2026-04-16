import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearFlowEvents } from "@/app/lib/flow-store";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("oidc_session");
  clearFlowEvents();

  return NextResponse.json({ success: true });
}
