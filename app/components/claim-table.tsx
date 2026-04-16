"use client";

const claimDescriptions: Record<string, string> = {
  iss: "トークンの発行者（Issuer）。OIDC Provider の識別子。",
  sub: "ユーザーの一意識別子（Subject）。Provider 内でユニーク。",
  aud: "トークンの対象者（Audience）。Client ID と一致するはず。",
  exp: "有効期限（Expiration）。Unix タイムスタンプ。",
  iat: "発行日時（Issued At）。Unix タイムスタンプ。",
  nonce: "リプレイ攻撃防止用の値。認可リクエスト時に送った値と一致するはず。",
  email: "ユーザーのメールアドレス。scope に email が含まれている場合に取得。",
  email_verified: "メールアドレスが検証済みかどうか。",
  name: "ユーザーの表示名。scope に profile が含まれている場合に取得。",
  picture: "プロフィール画像のURL。",
  given_name: "名（First Name）。",
  family_name: "姓（Last Name）。",
  locale: "ユーザーのロケール設定。",
  at_hash: "Access Token のハッシュ値（前半分）。ID Token と Access Token の紐付け検証に使用。",
  azp: "認可された当事者（Authorized Party）。複数の audience がある場合に Client ID が入る。",
};

type Props = {
  claims: Record<string, unknown>;
};

export default function ClaimTable({ claims }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-100 dark:bg-zinc-900">
            <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
              Claim
            </th>
            <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
              Value
            </th>
            <th className="text-left px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(claims).map(([key, value]) => (
            <tr
              key={key}
              className="border-t border-zinc-200 dark:border-zinc-800"
            >
              <td className="px-4 py-2 font-mono text-xs text-zinc-900 dark:text-zinc-100">
                {key}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-blue-700 dark:text-blue-300 max-w-xs truncate">
                {typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500">
                {claimDescriptions[key] || "カスタムクレーム"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
