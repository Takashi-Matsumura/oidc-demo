import { notFound } from "next/navigation";
import { getClient, getPendingRequest, listUsers } from "@/app/lib/oidc-provider";
import ConsentForm from "./consent-form";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  const { req } = await searchParams;
  if (!req) notFound();

  const pending = getPendingRequest(req);
  if (!pending) notFound();

  const client = getClient(pending.client_id);
  if (!client) notFound();

  const users = listUsers();
  const scopes = pending.scope.split(/\s+/).filter(Boolean);

  return (
    <div className="max-w-xl mx-auto px-8 py-12">
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <p className="text-xs uppercase tracking-wider text-zinc-500">
            Local OIDC Provider
          </p>
          <h1 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            ログインと同意
          </h1>
        </div>

        <div className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            <span className="font-semibold">{client.client_name}</span>{" "}
            (<code className="font-mono text-xs">{client.client_id}</code>) が
            次の情報へのアクセスを求めています。
          </p>
          <ul className="mt-3 space-y-1">
            {scopes.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                <code className="font-mono text-xs">{s}</code>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <ConsentForm
            requestId={pending.id}
            users={users.map((u) => ({
              sub: u.sub,
              username: u.username,
              email: u.email,
              name: u.name,
            }))}
          />
        </div>

        <div className="border-t border-zinc-200 px-6 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          テストユーザーのパスワードはすべて <code className="font-mono">password</code> です。
        </div>
      </div>
    </div>
  );
}
