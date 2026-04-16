"use client";

import { useState } from "react";

type Props = {
  method: string;
  url: string;
  direction: "outgoing" | "incoming";
  headers?: Record<string, string>;
  body?: string;
  response?: {
    status: number;
    headers?: Record<string, string>;
    body: string;
  };
  explanation: string;
};

export default function HttpExchange({
  method,
  url,
  direction,
  headers,
  body,
  response,
  explanation,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const dirLabel = direction === "outgoing" ? "送信" : "受信";
  const dirColor =
    direction === "outgoing"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
      >
        <span
          className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${dirColor}`}
        >
          {dirLabel}
        </span>
        <span className="shrink-0 font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
          {method}
        </span>
        <span className="font-mono text-xs text-zinc-500 truncate">{url}</span>
        <span className="ml-auto shrink-0 text-zinc-400">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/50">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {explanation}
          </p>

          {headers && Object.keys(headers).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">
                Headers
              </p>
              <pre className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900 rounded p-2 overflow-x-auto">
                {Object.entries(headers)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join("\n")}
              </pre>
            </div>
          )}

          {body && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">Body</p>
              <pre className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {body}
              </pre>
            </div>
          )}

          {response && (
            <div>
              <p className="text-xs font-semibold text-zinc-500 mb-1">
                Response ({response.status})
              </p>
              <pre className="text-xs font-mono bg-zinc-100 dark:bg-zinc-900 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                {response.body}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
