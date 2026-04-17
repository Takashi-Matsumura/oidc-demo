"use client";

import { useState } from "react";

type UserOption = {
  sub: string;
  username: string;
  email: string;
  name: string;
};

export default function ConsentForm({
  requestId,
  users,
}: {
  requestId: string;
  users: UserOption[];
}) {
  const [username, setUsername] = useState(users[0]?.username ?? "");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/provider/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          username,
          password,
          action: "approve",
        }),
      });
      const data = (await res.json()) as { redirect?: string; error?: string };
      if (!res.ok || !data.redirect) {
        setError(data.error ?? "認証に失敗しました");
        setSubmitting(false);
        return;
      }
      window.location.href = data.redirect;
    } catch {
      setError("通信エラー");
      setSubmitting(false);
    }
  }

  async function onDeny() {
    setSubmitting(true);
    const res = await fetch("/api/provider/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, action: "deny" }),
    });
    const data = (await res.json()) as { redirect?: string };
    if (data.redirect) window.location.href = data.redirect;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">ユーザー</span>
        <select
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          {users.map((u) => (
            <option key={u.sub} value={u.username}>
              {u.username} ({u.name} / {u.email})
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-zinc-700 dark:text-zinc-300">パスワード</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          ログインして許可
        </button>
        <button
          type="button"
          onClick={onDeny}
          disabled={submitting}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          拒否
        </button>
      </div>
    </form>
  );
}
