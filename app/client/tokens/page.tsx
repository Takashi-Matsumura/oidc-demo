"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ClaimTable from "@/app/components/claim-table";
import TokenInspector from "@/app/components/token-inspector";

type SessionData = {
  authenticated: boolean;
  tokens?: {
    raw_id_token: string;
    id_token_header: Record<string, unknown>;
    id_token_payload: Record<string, unknown>;
  };
};

export default function TokensPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/oidc/session")
      .then((res) => res.json())
      .then((data) => setSession(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-16">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session?.authenticated || !session.tokens) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-16">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          トークン検証
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
    <div className="max-w-4xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        ID Token 詳細
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        ID Token の構造と各クレームの意味を確認できます。
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
          JWT 構造
        </h2>
        <TokenInspector
          rawToken={session.tokens.raw_id_token}
          header={session.tokens.id_token_header}
          payload={session.tokens.id_token_payload}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
          クレーム一覧
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          ID Token の Payload に含まれる各クレーム（claim）とその説明です。
          OIDC では標準クレームが定義されており、scope によって取得できるクレームが変わります。
        </p>
        <ClaimTable claims={session.tokens.id_token_payload} />
      </section>

      <section className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          検証ポイント
        </h2>
        <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li className="flex gap-2">
            <span className="text-green-500">&#10003;</span>
            <span>
              <strong>署名検証</strong>: Google の JWKS エンドポイントから公開鍵を取得し、RS256 署名を検証
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-500">&#10003;</span>
            <span>
              <strong>iss（Issuer）検証</strong>: 発行者が <code>https://accounts.google.com</code> であることを確認
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-500">&#10003;</span>
            <span>
              <strong>aud（Audience）検証</strong>: 対象者が自分の Client ID と一致することを確認
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-500">&#10003;</span>
            <span>
              <strong>exp（Expiration）検証</strong>: トークンが期限切れでないことを確認
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-500">&#10003;</span>
            <span>
              <strong>nonce 検証</strong>: 認可リクエスト時に送った nonce と一致することを確認（リプレイ攻撃防止）
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}
