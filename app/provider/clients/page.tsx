import { listClients } from "@/app/lib/oidc-provider";

export default function ProviderClientsPage() {
  const clients = listClients();
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight">登録クライアント</h1>
      <p className="mt-2 text-sm text-zinc-500">
        この Provider に登録されているクライアント一覧です。初期状態では Phase 1 デモ用の
        クライアントが 1 つ登録されています。新規登録は{" "}
        <code className="font-mono text-xs">POST /api/provider/register</code> で可能です。
      </p>

      <div className="mt-6 space-y-4">
        {clients.map((c) => (
          <div
            key={c.client_id}
            className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{c.client_name}</h2>
              <span className="text-xs text-zinc-400">
                created {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-zinc-500">client_id</dt>
              <dd className="font-mono text-xs">{c.client_id}</dd>
              <dt className="text-zinc-500">client_secret</dt>
              <dd className="font-mono text-xs">{c.client_secret}</dd>
              <dt className="text-zinc-500">redirect_uris</dt>
              <dd className="font-mono text-xs">
                {c.redirect_uris.map((uri) => (
                  <div key={uri}>{uri}</div>
                ))}
              </dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
