"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TokenInspector from "@/app/components/token-inspector";

type SessionData = {
  authenticated: boolean;
  tokens?: {
    raw_id_token: string;
    id_token_header: Record<string, unknown>;
    id_token_payload: Record<string, unknown>;
    access_token: string;
    token_type: string;
    expires_in: number;
  };
};

function CallbackContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/oidc/session")
      .then((res) => res.json())
      .then((data) => setSession(data))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-2xl font-bold text-red-600">
          コールバックエラー
        </h1>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {error}
        </p>
        <Link
          href="/client/login"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ログインに戻る
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session?.authenticated || !session.tokens) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          コールバック
        </h1>
        <p className="mt-4 text-sm text-zinc-500">
          まだ認証フローが実行されていません。
        </p>
        <Link
          href="/client/login"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          ログインへ進む
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        コールバック結果
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        認可コードの交換が成功し、以下のトークンを取得しました。
      </p>

      <div className="mt-8 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
        <p className="text-sm font-medium text-green-700 dark:text-green-300">
          認証成功 - ID Token を取得・検証しました
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
          ID Token
        </h2>
        <TokenInspector
          rawToken={session.tokens.raw_id_token}
          header={session.tokens.id_token_header}
          payload={session.tokens.id_token_payload}
        />
      </div>

      <div className="mt-6 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Token Response メタデータ
        </h3>
        <div className="space-y-1 text-sm">
          <p className="text-zinc-500">
            <span className="font-mono">token_type:</span>{" "}
            {session.tokens.token_type}
          </p>
          <p className="text-zinc-500">
            <span className="font-mono">expires_in:</span>{" "}
            {session.tokens.expires_in} 秒
          </p>
          <p className="text-zinc-500">
            <span className="font-mono">access_token:</span>{" "}
            <code className="text-xs">{session.tokens.access_token}</code>
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href="/client/tokens"
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          クレームを詳しく見る
        </Link>
        <Link
          href="/client/flow-log"
          className="px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          フローログ
        </Link>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-8 py-16">
          <p className="text-zinc-400">Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
