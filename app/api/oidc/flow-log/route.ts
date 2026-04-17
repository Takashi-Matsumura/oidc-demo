import { NextRequest, NextResponse } from "next/server";
import { getFlowEvents } from "@/app/lib/flow-store";
import type { FlowEvent } from "@/app/lib/types";

export async function GET(request: NextRequest) {
  const actor = request.nextUrl.searchParams.get("actor");
  const all = getFlowEvents();
  const events =
    actor === "client" || actor === "provider"
      ? all.filter((e: FlowEvent) => e.actor === actor)
      : all;
  return NextResponse.json({ events });
}
