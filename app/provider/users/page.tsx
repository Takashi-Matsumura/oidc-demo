import { listUsers } from "@/app/lib/oidc-provider";

export default function ProviderUsersPage() {
  const users = listUsers();
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight">テストユーザー</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Provider に組み込まれた学習用のテストユーザーです。パスワードは全員{" "}
        <code className="font-mono">password</code> です。
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-2">sub</th>
              <th className="px-4 py-2">username</th>
              <th className="px-4 py-2">name</th>
              <th className="px-4 py-2">email</th>
              <th className="px-4 py-2">verified</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.sub}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-4 py-2 font-mono text-xs">{u.sub}</td>
                <td className="px-4 py-2">{u.username}</td>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  {u.email_verified ? (
                    <span className="text-green-600">true</span>
                  ) : (
                    <span className="text-zinc-400">false</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
