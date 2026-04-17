import type { FlowEvent } from "./types";

// Next.js (Turbopack) では RSC と Route Handler が別モジュールインスタンスと
// して読み込まれることがあるため、globalThis 経由で state を共有する。
const globalRef = globalThis as typeof globalThis & {
  __oidcFlowEvents?: FlowEvent[];
};

function getEventStore(): FlowEvent[] {
  if (!globalRef.__oidcFlowEvents) {
    globalRef.__oidcFlowEvents = [];
  }
  return globalRef.__oidcFlowEvents;
}

export function addFlowEvent(
  event: Omit<FlowEvent, "id" | "timestamp">,
): void {
  getEventStore().push({
    ...event,
    actor: event.actor ?? "client",
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
}

export function getFlowEvents(): FlowEvent[] {
  return [...getEventStore()];
}

export function getFlowEventsByActor(
  actor: FlowEvent["actor"],
): FlowEvent[] {
  return getEventStore().filter((e) => e.actor === actor);
}

export function clearFlowEvents(): void {
  globalRef.__oidcFlowEvents = [];
}
