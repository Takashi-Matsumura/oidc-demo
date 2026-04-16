"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessionData = {
  authenticated: boolean;
  user?: {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    provider: string;
  };
};

export default function ClientDashboard() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/oidc/session")
      .then((res) => res.json())
      .then((data) => setSession(data))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/oidc/logout", { method: "POST" });
    setSession({ authenticated: false });
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        OIDC Client ダッシュボード
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Relying Party（このアプリ）の認証状態を表示します。
      </p>

      <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${session?.authenticated ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-700"}`}
          />
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            {session?.authenticated ? "認証済み" : "未認証"}
          </span>
        </div>

        {session?.authenticated && session.user && (
          <div className="mt-4 space-y-2 text-sm">
            {session.user.picture && (
              <img
                src={session.user.picture}
                alt=""
                className="w-12 h-12 rounded-full"
              />
            )}
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-400">Name:</span>{" "}
              {session.user.name || "N/A"}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-400">Email:</span>{" "}
              {session.user.email || "N/A"}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-400">Subject:</span>{" "}
              {session.user.sub}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-400">Provider:</span>{" "}
              {session.user.provider}
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {session?.authenticated ? (
            <>
              <Link
                href="/client/tokens"
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                トークンを確認
              </Link>
              <Link
                href="/client/flow-log"
                className="px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
              >
                フローログを確認
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              >
                ログアウト
              </button>
            </>
          ) : (
            <Link
              href="/client/login"
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              ログインへ進む
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
