"use client";

import type { FlowEvent } from "@/app/lib/types";
import HttpExchange from "./http-exchange";

type Props = {
  events: FlowEvent[];
};

export default function Timeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p className="text-sm">
          まだフローイベントがありません。ログインを実行してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-4" />
            {i < events.length - 1 && (
              <div className="w-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            )}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-xs text-zinc-400 mb-1">
              {new Date(event.timestamp).toLocaleTimeString("ja-JP")} —{" "}
              {event.step}
            </p>
            <HttpExchange
              method={event.method}
              url={event.url}
              direction={event.direction}
              headers={event.headers}
              body={event.body}
              response={event.response}
              explanation={event.explanation}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
