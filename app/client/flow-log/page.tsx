"use client";

import { useEffect, useState } from "react";
import Timeline from "@/app/components/timeline";
import type { FlowEvent } from "@/app/lib/types";

export default function FlowLogPage() {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = () => {
    fetch("/api/oidc/flow-log")
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            フローログ
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            OIDC 認証フロー中に発生した全 HTTP リクエスト/レスポンスのタイムラインです。
          </p>
        </div>
        <button
          onClick={fetchEvents}
          className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          更新
        </button>
      </div>

      <div className="mt-8">
        <Timeline events={events} />
      </div>

      {events.length > 0 && (
        <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
            フローの読み方
          </h2>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mr-2">
                送信
              </span>
              このアプリから外部サーバーへのリクエスト
            </li>
            <li>
              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 mr-2">
                受信
              </span>
              外部サーバーからのレスポンス
            </li>
            <li>
              各項目をクリックすると、ヘッダー、ボディ、説明が展開されます。
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
