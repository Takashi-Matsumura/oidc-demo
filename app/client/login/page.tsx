import StepExplainer from "@/app/components/step-explainer";
import LoginButton from "./login-button";

export default function LoginPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        OIDC ログイン
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Google または Local Provider を Identity Provider として Authorization Code Flow + PKCE を実行します。
      </p>

      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          これから起こること
        </h2>
        <StepExplainer
          step={1}
          title="認可リクエストの構築"
          description="state（CSRF防止）、nonce（リプレイ防止）、PKCE code_challenge を生成し、これらを cookie に保存します。"
        />
        <StepExplainer
          step={2}
          title="Google の認可エンドポイントにリダイレクト"
          description="ブラウザが Google のログイン画面に遷移します。scope として openid, profile, email を要求します。"
        />
        <StepExplainer
          step={3}
          title="ユーザーがログイン・同意"
          description="Google アカウントでログインし、情報共有に同意します。"
        />
        <StepExplainer
          step={4}
          title="認可コードの受信"
          description="Google が認可コードを付けて /api/oidc/callback にリダイレクトします。"
        />
        <StepExplainer
          step={5}
          title="トークン交換"
          description="サーバーサイドで認可コードをトークンエンドポイントに送り、ID Token と Access Token を取得します。"
        />
        <StepExplainer
          step={6}
          title="ID Token の検証"
          description="署名（JWKS）、iss、aud、exp、nonce を検証してユーザー情報を確認します。"
        />
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          Provider を選択
        </h2>
        <LoginButton />
      </div>
    </div>
  );
}
