import Link from "next/link";
import { listClients, listUsers, PROVIDER_ISSUER } from "@/app/lib/oidc-provider";

export default function ProviderDashboardPage() {
  const clients = listClients();
  const users = listUsers();

  const endpoints = [
    ["Discovery", `${PROVIDER_ISSUER}/.well-known/openid-configuration`],
    ["JWKS", `${PROVIDER_ISSUER}/jwks`],
    ["Authorize", `${PROVIDER_ISSUER}/authorize`],
    ["Token", `${PROVIDER_ISSUER}/token`],
    ["UserInfo", `${PROVIDER_ISSUER}/userinfo`],
    ["Register", `${PROVIDER_ISSUER}/register`],
  ] as const;

  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Local OIDC Provider
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        このアプリ内部にビルトインされた OIDC Provider です。すべてインメモリで動作し、起動ごとに
        RSA 鍵ペア、テストユーザー、デフォルトクライアントが初期化されます。
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">エンドポイント</h2>
        <div className="mt-3 rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <tbody>
              {endpoints.map(([label, url]) => (
                <tr
                  key={label}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="w-32 px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {url}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-4">
        <Link
          href="/provider/clients"
          className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <h3 className="font-semibold">登録クライアント</h3>
          <p className="mt-1 text-sm text-zinc-500">{clients.length} 件</p>
        </Link>
        <Link
          href="/provider/users"
          className="rounded-lg border border-zinc-200 p-4 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
        >
          <h3 className="font-semibold">テストユーザー</h3>
          <p className="mt-1 text-sm text-zinc-500">{users.length} 件</p>
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">使い方</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            <Link href="/client/login" className="text-blue-600 hover:underline">
              ログインページ
            </Link>
            で「Provider: Local」を選択。
          </li>
          <li>「ログイン」ボタンで認可フロー開始。このアプリ内の同意画面が表示されます。</li>
          <li>テストユーザー（alice / bob / carol、パスワードは全員 <code>password</code>）でログイン。</li>
          <li>Phase 1 と同じコールバック画面で ID Token の検証結果が確認できます。</li>
        </ol>
      </section>
    </div>
  );
}
