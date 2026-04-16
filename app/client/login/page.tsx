import StepExplainer from "@/app/components/step-explainer";

export default function LoginPage() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        OIDC ログイン
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Google を Identity Provider として Authorization Code Flow + PKCE を実行します。
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
        <a
          href="/api/oidc/auth"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google でログイン
        </a>
        <p className="mt-3 text-xs text-zinc-400">
          クリックすると /api/oidc/auth にアクセスし、Google の認可エンドポイントにリダイレクトされます。
        </p>
      </div>
    </div>
  );
}
