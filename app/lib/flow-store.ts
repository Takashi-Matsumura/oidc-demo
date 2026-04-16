import type { FlowEvent } from "./types";

// インメモリでフローイベントを保持（開発サーバーのライフタイム）
let events: FlowEvent[] = [];

export function addFlowEvent(
  event: Omit<FlowEvent, "id" | "timestamp">,
): void {
  events.push({
    ...event,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
}

export function getFlowEvents(): FlowEvent[] {
  return [...events];
}

export function clearFlowEvents(): void {
  events = [];
}
