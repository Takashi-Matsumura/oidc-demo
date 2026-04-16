"use client";

import CodeBlock from "./code-block";

type Props = {
  rawToken: string;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
};

export default function TokenInspector({ rawToken, header, payload }: Props) {
  const parts = rawToken.split(".");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
          Raw JWT（3つのパートを . で連結）
        </h3>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-950 overflow-x-auto">
          <code className="text-xs break-all">
            <span className="text-red-600 dark:text-red-400">{parts[0]}</span>
            <span className="text-zinc-400">.</span>
            <span className="text-blue-600 dark:text-blue-400">{parts[1]}</span>
            <span className="text-zinc-400">.</span>
            <span className="text-green-600 dark:text-green-400">{parts[2]}</span>
          </code>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
            Header
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40" />
            Payload
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
            Signature
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CodeBlock title="Header（署名アルゴリズム・鍵ID）">
          {JSON.stringify(header, null, 2)}
        </CodeBlock>
        <CodeBlock title="Payload（クレーム）">
          {JSON.stringify(payload, null, 2)}
        </CodeBlock>
      </div>
    </div>
  );
}
