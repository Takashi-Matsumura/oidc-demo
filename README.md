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
| Phase 2 | OIDC Provider (Identity Provider) — 自前で IdP を構築 | 未着手 |
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
  api/oidc/
    auth/route.ts                # 認可リクエスト
    callback/route.ts            # コールバック処理
    userinfo/route.ts            # UserInfo プロキシ
    session/route.ts             # セッション取得
    logout/route.ts              # ログアウト
    flow-log/route.ts            # フローログ取得
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
    jwt-utils.ts                 # JWT デコード・検証 (jose)
    crypto-utils.ts              # state/nonce/PKCE 生成
    flow-store.ts                # フローイベントのインメモリ記録
    types.ts                     # 型定義
```

## ライセンス

Private
