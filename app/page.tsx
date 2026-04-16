import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        OIDC Demo
      </h1>
      <p className="mt-2 text-zinc-500">
        OpenID Connect の仕組みを、手を動かしながら学ぶデモアプリです。
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
          OpenID Connect（OIDC）とは？
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          OIDC は OAuth 2.0 の上に構築された<strong>認証</strong>レイヤーです。
          OAuth 2.0 が「このアプリにリソースへのアクセスを許可してよいか？」（認可）を扱うのに対し、
          OIDC は「このユーザーは誰か？」（認証）を扱います。
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          OIDC を使うと、既存の認証システム（Identity Provider）に認証を委譲し、
          別のアプリケーション（Relying Party）からそのユーザー情報を安全に取得できます。
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
          3つの登場人物
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
              End User
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              ログインするユーザー本人。ブラウザを操作してIDとパスワードを入力する。
            </p>
          </div>
          <div className="rounded-lg border border-blue-200 dark:border-blue-900 p-4 bg-blue-50/50 dark:bg-blue-950/20">
            <h3 className="font-semibold text-sm text-blue-800 dark:text-blue-200">
              Relying Party（Client）
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              ユーザー認証を依頼するアプリ。このデモアプリ自身がこの役割。
            </p>
          </div>
          <div className="rounded-lg border border-green-200 dark:border-green-900 p-4 bg-green-50/50 dark:bg-green-950/20">
            <h3 className="font-semibold text-sm text-green-800 dark:text-green-200">
              Identity Provider（IdP）
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              認証を行うサーバー。Phase 1 では Google、Phase 2 では自前のProviderがこの役割。
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
          Authorization Code Flow
        </h2>
        <div className="mt-4 space-y-3 text-sm">
          {[
            {
              step: 1,
              text: "Client が認可エンドポイントにリダイレクト（state, nonce, PKCE を含む）",
            },
            {
              step: 2,
              text: "ユーザーが IdP でログイン・同意",
            },
            {
              step: 3,
              text: "IdP が認可コード付きで Client にリダイレクトバック",
            },
            {
              step: 4,
              text: "Client がトークンエンドポイントで認可コードをトークンに交換",
            },
            {
              step: 5,
              text: "Client が ID Token を検証（署名、iss、aud、exp、nonce）",
            },
            {
              step: 6,
              text: "（オプション）Access Token で UserInfo エンドポイントを呼び出し",
            },
          ].map(({ step, text }) => (
            <div key={step} className="flex gap-3 items-start">
              <span className="shrink-0 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                {step}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400">{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">
          このデモの構成
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link
            href="/client"
            className="block rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            <h3 className="font-semibold text-blue-700 dark:text-blue-300">
              Phase 1: OIDC Client
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Google を IdP として Authorization Code Flow + PKCE を手動実装。
              全HTTPリクエストをログに記録して可視化します。
            </p>
          </Link>
          <div className="block rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 opacity-50">
            <h3 className="font-semibold text-zinc-500">
              Phase 2: OIDC Provider（準備中）
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              自前の OIDC Provider を構築して、Phase 1 の Client から接続します。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
