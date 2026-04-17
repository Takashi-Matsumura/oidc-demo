import Timeline from "@/app/components/timeline";
import { getFlowEventsByActor } from "@/app/lib/flow-store";

export const dynamic = "force-dynamic";

export default function ProviderLogsPage() {
  const events = getFlowEventsByActor("provider");
  return (
    <div className="max-w-4xl mx-auto px-8 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider ログ</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Local Provider 側で発生した HTTP リクエスト/レスポンスのタイムラインです。
            Client 側と別のリクエストとして観察できます。
          </p>
        </div>
      </div>

      <div className="mt-6">
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            まだイベントがありません。クライアントから Local Provider へのログインを試してください。
          </p>
        ) : (
          <Timeline events={events} />
        )}
      </div>
    </div>
  );
}
