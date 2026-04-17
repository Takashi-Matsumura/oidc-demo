"use client";

import { useState } from "react";

type ProviderKey = "google" | "local" | "lion-frame";

type ProviderOption = {
  value: ProviderKey;
  label: string;
  hint: string;
};

const providers: ProviderOption[] = [
  {
    value: "google",
    label: "Google",
    hint: "外部 OIDC Provider。.env.local の GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が必要。",
  },
  {
    value: "local",
    label: "Local Provider (Phase 2)",
    hint: "このアプリ内部にビルトインされた OIDC Provider。テストユーザーで認証できます。",
  },
  {
    value: "lion-frame",
    label: "LionFrame (Phase 3)",
    hint: "別プロセスで動作する LionFrame (http://localhost:3000) を IdP として利用。.env.local に LIONFRAME_CLIENT_ID / LIONFRAME_CLIENT_SECRET が必要。",
  },
];

export default function LoginButton() {
  const [provider, setProvider] = useState<ProviderKey>("google");
  const selected = providers.find((p) => p.value === provider)!;

  return (
    <div>
      <div className="space-y-2">
        {providers.map((p) => (
          <label
            key={p.value}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              provider === p.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            }`}
          >
            <input
              type="radio"
              name="provider"
              value={p.value}
              checked={provider === p.value}
              onChange={() => setProvider(p.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {p.label}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">{p.hint}</div>
            </div>
          </label>
        ))}
      </div>

      <a
        href={`/api/oidc/auth?provider=${provider}`}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
      >
        {selected.label} でログイン
      </a>
      <p className="mt-3 text-xs text-zinc-400">
        クリックすると{" "}
        <code className="font-mono">/api/oidc/auth?provider={provider}</code>{" "}
        にアクセスし、
        {provider === "google"
          ? "Google の認可エンドポイント"
          : provider === "lion-frame"
            ? "LionFrame の認可エンドポイント（未ログインならログイン画面）"
            : "Local Provider の同意画面"}
        にリダイレクトされます。
      </p>
    </div>
  );
}
