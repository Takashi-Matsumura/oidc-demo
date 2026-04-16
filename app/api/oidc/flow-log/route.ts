import { NextResponse } from "next/server";
import { getFlowEvents } from "@/app/lib/flow-store";

export async function GET() {
  return NextResponse.json({ events: getFlowEvents() });
}
