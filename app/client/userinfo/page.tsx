"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CodeBlock from "@/app/components/code-block";
import type { UserInfoResponse } from "@/app/lib/types";

export default function UserInfoPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/oidc/session")
      .then((res) => res.json())
      .then((data) => setAuthenticated(data.authenticated))
      .finally(() => setLoading(false));
  }, []);

  const handleFetch = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/oidc/userinfo");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setUserInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          UserInfo Endpoint
        </h1>
        <p className="mt-4 text-sm text-zinc-500">
          まだ認証されていません。
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
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        UserInfo Endpoint
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Access Token を使って OIDC Provider の UserInfo エンドポイントを呼び出します。
        ID Token のクレームと比較して、最新の情報を確認できます。
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          HTTPリクエスト
        </h2>
        <CodeBlock title="GET Request">
          {`GET /userinfo HTTP/1.1
Host: openidconnect.googleapis.com
Authorization: Bearer [ACCESS_TOKEN]`}
        </CodeBlock>
        <p className="mt-3 text-xs text-zinc-500">
          Access Token を Bearer トークンとして Authorization ヘッダーに含めます。
          このエンドポイントは ID Token とは異なり、常にサーバーから最新のユーザー情報を返します。
        </p>
      </div>

      <div className="mt-6">
        <button
          onClick={handleFetch}
          disabled={fetching}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {fetching ? "取得中..." : "UserInfo を取得"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {userInfo && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
            UserInfo レスポンス
          </h2>
          <CodeBlock title="JSON Response">
            {JSON.stringify(userInfo, null, 2)}
          </CodeBlock>
        </div>
      )}
    </div>
  );
}
