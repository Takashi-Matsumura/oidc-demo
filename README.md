# OIDC Demo

OpenID Connect (OIDC) の仕組みを、手を動かしながら学ぶためのデモアプリです。

認証ライブラリ (NextAuth 等) を使わず、Authorization Code Flow + PKCE を手動で実装することで、OIDC プロトコルの各ステップを可視化します。

## 背景

社内バックオフィスDXアプリ (lion-frame) の既存認証基盤を、別のアプリケーションから OIDC を使って再利用できるかを検証する目的で開発を始めました。

## 技術スタック

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- jose (JWT 署名・検証)

## フェーズ構成

| Phase | 内容 | 状態 |
|-------|------|------|
| Phase 1 | OIDC Client (Relying Party) — Google を IdP として利用 | 検証済み |
| Phase 2 | OIDC Provider (Identity Provider) — 自前で IdP を構築 | 検証中 |
| Phase 3 | lion-frame への適用設計 (ドキュメントのみ) | 未着手 |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を設定してください。

```bash
GOOGLE_CLIENT_ID=<Google Cloud Console の OAuth 2.0 クライアント ID>
GOOGLE_CLIENT_SECRET=<クライアントシークレット>
SESSION_SECRET=<32文字以上のランダム文字列>
```

`SESSION_SECRET` の生成例:

```bash
openssl rand -base64 32
```

### 3. Google Cloud Console の設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」>「認証情報」> OAuth 2.0 クライアント ID を作成
3. 承認済みリダイレクト URI に `http://localhost:3000/api/oidc/callback` を追加

### 4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスしてください。

## Phase 1: OIDC Client

NextAuth 等を使わず、OIDC の Authorization Code Flow + PKCE を手動で実装しています。すべての HTTP リクエスト/レスポンスをフローログに記録し、プロトコルの流れを可視化します。

### 学べる概念

- Discovery Document (`.well-known/openid-configuration`)
- Authorization Endpoint / `response_type=code`
- state (CSRF 防止)、nonce (リプレイ防止)
- PKCE (`code_verifier` / `code_challenge`)
- Token Endpoint でのコード交換
- ID Token の構造 (`header.payload.signature`) と検証
- Access Token と UserInfo Endpoint
- Scopes (`openid`, `profile`, `email`)

### ページ構成

| パス | 内容 |
|------|------|
| `/` | OIDC 概要説明 (3つの登場人物、Authorization Code Flow の解説) |
| `/client` | クライアントダッシュボード (認証状態の表示) |
| `/client/login` | ログインページ (フローの各ステップ解説 + Google ログインボタン) |
| `/client/callback` | コールバック結果 (ID Token の 3 分割表示) |
| `/client/tokens` | ID Token のクレーム一覧テーブルと検証ポイント |
| `/client/userinfo` | UserInfo Endpoint の呼び出しと結果表示 |
| `/client/flow-log` | 認証フロー中の全 HTTP リクエスト/レスポンスのタイムライン |

### API Routes

| エンドポイント | 説明 |
|---------------|------|
| `GET /api/oidc/auth` | 認可 URL 構築、PKCE/state/nonce 生成、Google へリダイレクト |
| `GET /api/oidc/callback` | 認可コード交換、ID Token 検証、セッション発行 |
| `GET /api/oidc/userinfo` | UserInfo Endpoint プロキシ |
| `GET /api/oidc/session` | 現在のセッション状態を返す |
| `POST /api/oidc/logout` | セッションクリア |
| `GET /api/oidc/flow-log` | フローイベント一覧を返す |

### Phase 1 で学んだこと・気づいたこと

実際に Google をつないで動かしてみて得られた知見のメモです。

#### 1. OIDC は「OAuth 2.0 + ID Token」という構図

OAuth 2.0 は本来「API へのアクセス権を委譲する仕組み（認可）」であり、「誰がログインしたか（認証）」を扱うものではなかった。OIDC は OAuth 2.0 の上に **ID Token** という署名付き JWT を乗せることで、認証の層を追加している。

- **Access Token**: Google の API を叩くための入館証 → UserInfo エンドポイントなどに `Authorization: Bearer` で渡す
- **ID Token**: 「誰がログインしたか」をアプリに伝える身分証 → 署名検証すればサーバーへの問い合わせなしで信頼できる

この 2 つが別物であることが、フローログで `token_exchange` レスポンスに両方が含まれているのを見て腑に落ちた。

#### 2. ID Token のクレームから得られる情報は scope で決まる

`scope=openid profile email` を要求した結果、以下が ID Token に含まれた。

| Scope | 取得できるクレーム |
|-------|------------------|
| `openid` | `sub`（Google 上の一意 ID）、`iss`、`aud`、`exp`、`iat` |
| `profile` | `name`, `given_name`, `family_name`, `picture` |
| `email` | `email`, `email_verified` |

`email_verified: true` は「Google がメール所有を確認済み」の保証であり、アプリ側で独自にメール確認フローを作る必要がなくなる。これがソーシャルログインの実利の中心。

追加の scope（例: `https://www.googleapis.com/auth/calendar`）を要求すれば Google Calendar API まで叩けるが、それは OAuth 2.0 の認可範囲であり、OIDC の認証とは別レイヤーの話。

#### 3. セキュリティパラメータはそれぞれ別の脅威を防いでいる

| パラメータ | 保存場所 | 防ぐ脅威 |
|-----------|---------|---------|
| `state` | cookie | CSRF（別サイト経由で認可コールバックを偽造される） |
| `nonce` | cookie → ID Token と照合 | リプレイ（過去に盗まれた ID Token の再利用） |
| PKCE `code_verifier` | cookie → トークン交換時に送信 | 認可コードの横取り（コードだけ盗まれてもトークン交換できない） |

これらをまとめて「とりあえず実装」ではなく、「何を防ぐためのものか」を分けて理解することが重要。

#### 4. ID Token の署名検証には JWKS が必要

ID Token の header に含まれる `kid` を使って、Google の JWKS エンドポイント（Discovery Document の `jwks_uri`）から公開鍵を取得し、`RS256` で署名検証する。jose ライブラリを使えば数行で書けるが、内部的には以下を実行している。

1. `iss` と `aud` の検証（発行者と宛先が正しいか）
2. `exp` の検証（有効期限切れでないか）
3. `nonce` の検証（cookie に保存した値と一致するか）
4. 署名の検証（JWKS の公開鍵で検証）
5. `at_hash` の検証（Access Token が改ざんされていないか）

#### 5. Discovery Document がすべての起点

`https://accounts.google.com/.well-known/openid-configuration` を最初に取得することで、authorization_endpoint、token_endpoint、userinfo_endpoint、jwks_uri などすべてが動的に得られる。Provider ごとに URL をハードコードしなくて済むのが OIDC の大きな利点。

#### 6. `sub` はアプリごとに安定した一意 ID

`sub` は Google 上で「このユーザー × このアプリ」に対して安定した ID。アプリ側のユーザーテーブルと紐付ける外部キーとして使える。メールアドレスは変更される可能性があるので、`sub` を正としてマッピングするのが定石。

#### 7. OIDC の 3 つの登場人物

| 役割 | 今回の Phase 1 | Phase 2 での変化 |
|------|---------------|----------------|
| **End User** | 自分（Google アカウント保持者） | テストユーザー |
| **Relying Party (RP)** | このデモアプリ | このデモアプリ（同じ） |
| **OpenID Provider (OP)** | Google | 自前で実装する |

Phase 2 では OP 側に回ることで、「発行者が何を署名して、何を検証させているか」を逆側から体験する。

## Phase 2: OIDC Provider

Phase 1 の Client を据え置いたまま、同じアプリ内部にインメモリの OpenID Provider (OP) を実装しました。Phase 1 で Google に投げていた認可リクエストを、そのまま自前 OP にも投げ、Client 側のコードをほぼ変えずに認証を成立させるのが狙いです。

### 構成

- RSA 鍵ペア、テストユーザー、デフォルトクライアントは起動時にインメモリで初期化
- 状態は `globalThis` 経由で共有し、RSC と Route Handler の別モジュールインスタンス境界を跨いでも失われないようにしている
- すべての HTTP 交換は Phase 1 と同じ `flow-store` に `actor: "provider"` として記録され、Client 側のイベントと同じタイムラインで観察できる

### ページ構成

| パス | 内容 |
|------|------|
| `/provider` | Provider ダッシュボード（エンドポイント一覧、使い方） |
| `/provider/clients` | 登録クライアント一覧（`client_id` / `client_secret` / `redirect_uris` を確認） |
| `/provider/users` | テストユーザー一覧（alice / bob / carol、パスワードは全員 `password`） |
| `/provider/consent` | 同意画面（認可リクエストの内容確認 + ユーザー名/パスワード入力） |
| `/provider/logs` | Provider 視点のフローログ |

### API Routes

| エンドポイント | 説明 |
|---------------|------|
| `GET /api/provider/.well-known/openid-configuration` | Discovery Document |
| `GET /api/provider/jwks` | 署名検証用の公開鍵 (JWKS) |
| `GET /api/provider/authorize` | 認可リクエスト受付、パラメータ検証、同意画面へリダイレクト |
| `POST /api/provider/consent` | 認証・同意の受付、認可コードの発行と `redirect_uri` への返却 |
| `POST /api/provider/token` | クライアント認証・認可コード消費・PKCE 検証、Access Token / ID Token 発行 |
| `GET /api/provider/userinfo` | `Authorization: Bearer` 検証、スコープに応じたクレーム返却 |
| `POST /api/provider/register` | 動的クライアント登録 (`client_id` / `client_secret` を生成) |

### クライアント切り替え

Phase 1 の `/client/login` に「Provider: Google | Local」トグルを追加。`Local` を選ぶと cookie 名に `oidc_provider_` プレフィックスが付与されて Google 側と状態が分離されるため、同じブラウザで両系統を並行検証できます。

### Phase 2 で学んだこと・気づいたこと

#### 1. OP が最低限公開すべき「面」の全体像

Phase 1 で Client が叩いていた URL はすべて Discovery Document に載っていたが、OP 側から見ると以下を**自分で揃える**必要がある。

| エンドポイント | OP の責務 |
|---|---|
| `.well-known/openid-configuration` | 以下の URL すべてを JSON で一覧する「インデックス」 |
| `jwks` | ID Token を検証するための公開鍵を `kid` 付きで公開 |
| `authorize` | RP からのリクエストを受け、ユーザー認証・同意へ誘導 |
| `token` | 認可コードを消費してトークンを返す（client 認証 + PKCE 検証） |
| `userinfo` | Access Token を検証してクレームを返す |
| `register` | 動的クライアント登録（RFC 7591） |

Client 側では「Discovery を取れば自動で繋がる」のが嬉しかったが、OP 側ではそれを**自分で破綻なく揃える責務**があることを痛感した。

#### 2. 認可コードの「短命・一回限り」は OP の責任

Phase 1 では「もらったコードを交換する」だけだったが、OP は次を自前で管理する必要がある。

- 生成時に短い TTL を付ける（本実装は 120 秒）
- 一度 `token` エンドポイントで消費されたら `used: true` にして再利用を拒否
- 発行時の `client_id` / `redirect_uri` / `code_challenge` をコードに紐付けて保存し、`token` で完全一致を検証

PKCE の `code_challenge` を**発行時に保存**し、`token` エンドポイントで `code_verifier` から SHA-256 で再計算して一致させる、というループを実装して初めて「なぜ Client に秘密を持たせなくて済むのか」が身体で理解できた。

#### 3. ID Token 署名の発行者側の責務

Phase 1 で `jose.jwtVerify()` が裏でやっていた検証を、そっくり裏返して発行する必要がある。

- RSA 鍵ペアを生成し、秘密鍵で RS256 署名
- 公開鍵は JWKS として `kid` 付きで公開（Client は `kid` でどの鍵か選べる）
- `iss` / `sub` / `aud` / `exp` / `iat` / `nonce` / `at_hash` をクレームに積む
- `at_hash` は Access Token の SHA-256 を左半分 base64url — 「この ID Token と Access Token は同時に発行された」ことを Client に保証するフィールド

スコープに応じて `name` / `email` / `email_verified` などを条件付きで足すのも OP の役割。**Client 側で `email_verified: true` だけ見て信用していたのは、OP のこの判定を信頼している**ということが明確になった。

#### 4. redirect_uri の検証は**完全一致**が原則

`client.redirect_uris.includes(redirect_uri)` で厳密に等しいかを確認。部分一致や prefix 一致にすると Open Redirect 経由で認可コードが奪われる。これが崩れると PKCE すら意味をなさない。

#### 5. 「認可リクエストの一時保存」という概念

`authorize` と `consent` は HTTP 的には別リクエスト・別ユーザー画面。間にログインフォームが入るので、リクエスト内容（`client_id` / `redirect_uri` / `scope` / `state` / `nonce` / `code_challenge`）を一旦 `pendingRequests` に保存し、ID だけをクエリで渡す。Phase 1 では cookie に全部詰めていたので、**状態を誰が持つかが RP / OP で真逆になる**点が面白い。

#### 6. エラー返却には 2 系統ある

- `client_id` / `redirect_uri` の検証前 → **JSON エラー**（攻撃者の redirect_uri に送らない）
- それ以降 → **`redirect_uri` に `error` / `error_description` を付けてリダイレクト**（RP が state と合わせて処理できる）

「どこまで検証が通ったら RP 側に投げ返していいか」の線引きが OP のセキュリティ設計の核。

#### 7. Next.js 16 の RSC / Route Handler 境界と state 共有

インメモリ state を単純な `const` で保持すると、RSC と Route Handler が別モジュールインスタンスになるタイミングがあり、**ログインしたのにトークンエンドポイントでコードが見つからない**という現象が出た。`globalThis` にぶら下げて共有することで解決（commit `3e98a12`）。プロトコル以前の、フレームワーク実装特有のハマりどころとして記録。

#### 8. Phase 3 への宿題

本実装はあくまで学習用なので、以下は意図的に省いている。lion-frame を OP 化する際の検討事項として控えておく。

- 鍵のローテーション（JWKS に複数の `kid` を並べる運用）
- クライアント認証の強化（`client_secret_basic` や `private_key_jwt`）
- 認可コード・トークンの永続化（DB ストアと TTL 管理）
- Refresh Token（本実装は未対応）
- ログアウト（RP-Initiated Logout, Back-Channel Logout）
- 同意の永続化（毎回同意画面を出さない UX）

## プロジェクト構造

```
app/
  page.tsx                       # ランディングページ
  layout.tsx                     # サイドバー付きルートレイアウト
  client/
    page.tsx                     # クライアントダッシュボード
    login/page.tsx               # ログインページ
    callback/page.tsx            # コールバック結果
    tokens/page.tsx              # トークン詳細
    userinfo/page.tsx            # UserInfo
    flow-log/page.tsx            # フローログ
  provider/
    page.tsx                     # Provider ダッシュボード
    clients/page.tsx             # 登録クライアント一覧
    users/page.tsx               # テストユーザー一覧
    consent/page.tsx             # 同意画面
    consent/consent-form.tsx     # 同意フォーム
    logs/page.tsx                # Provider 視点のフローログ
  api/oidc/
    auth/route.ts                # 認可リクエスト
    callback/route.ts            # コールバック処理
    userinfo/route.ts            # UserInfo プロキシ
    session/route.ts             # セッション取得
    logout/route.ts              # ログアウト
    flow-log/route.ts            # フローログ取得
  api/provider/
    .well-known/openid-configuration/route.ts  # Discovery
    jwks/route.ts                # 公開鍵 (JWKS)
    authorize/route.ts           # 認可エンドポイント
    consent/route.ts             # 同意受付・認可コード発行
    token/route.ts               # トークンエンドポイント
    userinfo/route.ts            # UserInfo エンドポイント
    register/route.ts            # 動的クライアント登録
  components/
    nav-sidebar.tsx              # サイドバーナビゲーション
    token-inspector.tsx          # JWT 3分割表示
    claim-table.tsx              # クレーム一覧テーブル
    http-exchange.tsx            # HTTP リクエスト/レスポンス表示
    step-explainer.tsx           # ステップ解説
    timeline.tsx                 # タイムライン表示
    code-block.tsx               # コードブロック
  lib/
    oidc-client.ts               # Discovery 取得、認可 URL 構築、コード交換、UserInfo 取得
    oidc-provider.ts             # 鍵管理、クライアント/ユーザー/コード/トークン、ID Token 発行
    jwt-utils.ts                 # JWT デコード・検証 (jose)
    crypto-utils.ts              # state/nonce/PKCE 生成
    flow-store.ts                # フローイベントのインメモリ記録
    types.ts                     # 型定義
```

## ライセンス

Private
