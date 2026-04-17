import type { FlowEvent } from "./types";

// インメモリでフローイベントを保持（開発サーバーのライフタイム）
let events: FlowEvent[] = [];

export function addFlowEvent(
  event: Omit<FlowEvent, "id" | "timestamp">,
): void {
  events.push({
    ...event,
    actor: event.actor ?? "client",
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
}

export function getFlowEvents(): FlowEvent[] {
  return [...events];
}

export function getFlowEventsByActor(
  actor: FlowEvent["actor"],
): FlowEvent[] {
  return events.filter((e) => e.actor === actor);
}

export function clearFlowEvents(): void {
  events = [];
}
