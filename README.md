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
| Phase 2 | OIDC Provider (Identity Provider) — 自前で IdP を構築 | 検証済み |
| Phase 3 | lion-frame への適用設計 + RP 側実装 + lion-frame と実連携 E2E 検証 | 検証済み |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を設定してください。

```bash
# RP (このアプリ) の公開 URL。redirect_uri の組み立てに使用。
# lion-frame を並行起動する場合 (:3000 を占有) は :3001 で動かす。
NEXTAUTH_URL=http://localhost:3001

# Google を IdP として使う場合
GOOGLE_CLIENT_ID=<Google Cloud Console の OAuth 2.0 クライアント ID>
GOOGLE_CLIENT_SECRET=<クライアントシークレット>

# lion-frame を IdP として使う場合 (Phase 3)
LIONFRAME_ISSUER=http://localhost:3000/api/oidc
LIONFRAME_CLIENT_ID=<lion-frame /admin/oidc/clients で発行した client_id>
LIONFRAME_CLIENT_SECRET=<同上の client_secret>

# セッション cookie 署名用
SESSION_SECRET=<32文字以上のランダム文字列>
```

`SESSION_SECRET` の生成例:

```bash
openssl rand -base64 32
```

### 3. Google Cloud Console の設定 (Google を IdP として使う場合)

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. 「APIとサービス」>「認証情報」> OAuth 2.0 クライアント ID を作成
3. 承認済みリダイレクト URI に `http://localhost:3001/api/oidc/callback` を追加

### 4. lion-frame の OIDC クライアント登録 (Phase 3 を試す場合)

1. lion-frame を別プロセスで起動 (既定で :3000)
2. ADMIN ロールでログインし `/admin/oidc/clients` で新規クライアント作成
   - Redirect URIs: `http://localhost:3001/api/oidc/callback`
   - Allowed Scopes: `openid profile email`
3. 発行された `client_id` / `client_secret` を `.env.local` の `LIONFRAME_CLIENT_ID` / `LIONFRAME_CLIENT_SECRET` に貼り付け (secret は作成時のみ表示)

### 5. 開発サーバーの起動

```bash
# lion-frame と共存するなら :3001
npm run dev -- -p 3001
```

http://localhost:3001 にアクセスしてください。

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

Phase 1 の `/client/login` に「Provider: Google | Local | LionFrame」トグルを追加。Provider 選択に応じて `app/lib/client-providers.ts` の `resolveProvider()` が issuer / client_id / client_secret を差し替えるため、RP の認可フロー本体 (`auth/route.ts` と `callback/route.ts`) はいずれの IdP でも同じコードパスで動きます。

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

## Phase 3: lion-frame への適用設計

Phase 2 の知見を土台に、社内バックオフィスDXアプリ [lion-frame](https://github.com/Takashi-Matsumura/lion-frame) を OIDC Provider として拡張する設計を行いました。実装は lion-frame リポジトリ側で行われるため、本リポジトリでは設計・要件定義のみを担当します。

**Issue**: [feat: OIDC Provider 化（別アプリから lion-frame の認証を利用できるようにする） #6](https://github.com/Takashi-Matsumura/lion-frame/issues/6)

### 設計の核

lion-frame は既に NextAuth で認証（Email/Password + 2FA / Google / GitHub）が完結している。Phase 3 で必要なのは **認証を作ることではなく、既存認証の結果を OIDC プロトコルの形式で外部アプリに公開すること**。つまり Phase 2 で作った OP エンドポイント群を、NextAuth セッションの**前段**に被せる構成になる。

```
外部アプリ (RP)
    ↓ OIDC 認可リクエスト
lion-frame /api/oidc/authorize
    ↓ 未ログインなら NextAuth の signin にリダイレクト
lion-frame 既存ログイン画面 (Email/Password + 2FA / Google / GitHub)
    ↓ NextAuth セッション cookie
lion-frame /api/oidc/authorize に戻る
    ↓ セッションから user_id を取得、同意画面へ
lion-frame /oidc/consent
    ↓ 認可コード発行、RP の redirect_uri へ
RP → /api/oidc/token → ID Token (lion:role クレーム付き)
```

**責務分離**: 認証 = NextAuth、認可プロトコル = 自前 OP 層。両者を `auth()` ヘルパで繋ぐ。

### 主な設計決定

- **データモデル**: Prisma に `OIDCClient` / `OIDCAuthCode` / `OIDCAccessToken` / `OIDCConsent` の 4 モデルを追加
- **カスタムクレーム**: `lion:role` (GUEST / USER / MANAGER / EXECUTIVE / ADMIN) と `lion:two_factor` を ID Token に付与
- **`sub`**: `User.id` (cuid) — 安定した内部 ID
- **鍵管理**: 環境変数 or KMS で永続化、JWKS に複数 `kid` を並べてローテーション可能に
- **セキュリティ**: PKCE 必須、redirect_uri 完全一致、既存の監査ログ・レート制限と統合
- **クライアント管理**: ADMIN ロール専用の管理 UI（動的登録 `/register` は無効化）

### 初期リリースで見送る機能

- Refresh Token（必要性が明確になってから）
- Back-Channel Logout
- 動的クライアント登録

### E2E 受け入れ条件の要旨

1. ADMIN が管理 UI でクライアント登録 → `client_id` / `client_secret` を発行
2. oidc-demo の `/client/login` で Provider に lion-frame を選択 → 既存ログイン画面 (2FA 含む) でログイン
3. 同意画面で scope を確認、2 回目以降は `OIDCConsent` によりスキップ
4. ID Token に `lion:role` クレームが含まれる
5. 認可コード再利用・無効化クライアントからのリクエストが `invalid_grant` で拒否される

全 10 項目の詳細は [Issue #6](https://github.com/Takashi-Matsumura/lion-frame/issues/6) の「受け入れ条件」セクションを参照。

### 本リポジトリから流用されるもの

Issue では oidc-demo の Phase 2 実装を **「動く仕様書」** として参照するかたちで、以下ファイルに直接リンクしている。

- `app/api/provider/.well-known/openid-configuration/route.ts`
- `app/api/provider/jwks/route.ts`
- `app/api/provider/authorize/route.ts`
- `app/api/provider/consent/route.ts`
- `app/api/provider/token/route.ts`
- `app/api/provider/userinfo/route.ts`

lion-frame 側の実装者は、これらを参考にしつつ Prisma 永続化・NextAuth 統合・既存 RBAC との連携を加える形で実装を進められる。

### RP 側サンプル実装と E2E 検証 (2026-04-18)

lion-frame 側で OIDC Provider 実装が完了したのを受け、**本リポジトリを RP として連携する最小サンプル** を追加し、実ログインで E2E を通した。

#### 追加/変更ファイル

| ファイル | 変更 |
|---------|------|
| `app/lib/client-providers.ts` | `ProviderKey` に `"lion-frame"` を追加。`resolveProvider()` で `LIONFRAME_ISSUER` / `LIONFRAME_CLIENT_ID` / `LIONFRAME_CLIENT_SECRET` を解決 |
| `app/client/login/login-button.tsx` | ログイン UI のラジオに「LionFrame (Phase 3)」を追加 |

既存の `/api/oidc/auth` と `/api/oidc/callback` は Provider-agnostic に書かれていたため、**コアロジックは一切触らずに** LionFrame を第三の IdP として追加できた。Phase 2 で入れた `resolveProvider` の抽象化が効いた形。

#### 実際に流したフロー

```
ブラウザ :3001/client/login
  ↓ 「LionFrame でログイン」
:3001/api/oidc/auth?provider=lion-frame
  ↓ state / nonce / code_verifier を cookie に保存、302
:3000/api/oidc/authorize?client_id=...&redirect_uri=http://localhost:3001/...
  ↓ NextAuth セッション確認 → /oidc/consent にリダイレクト
:3000/oidc/consent (LionFrame 既存ログイン + 同意画面)
  ↓ 「承認する」
:3001/api/oidc/callback?code=...&state=...
  ↓ サーバ間 POST (client_secret_post + code_verifier)
:3000/api/oidc/token → { id_token, access_token }
  ↓ JWKS 取得 → RS256 署名検証、iss/aud/exp/nonce 検証
:3001/client/callback (ID Token のクレーム可視化)
```

#### ID Token の中身 (抜粋)

```json
{
  "sub": "cmnjl1qhz0000z2eq21c1axf8",
  "email": "admin@lionframe.local",
  "email_verified": true,
  "name": "System Administrator",
  "lion:role": "ADMIN",
  "lion:two_factor": false,
  "aud": "lionframe_6406f5db537b4e4a7181884d",
  "iss": "http://localhost:3000"
}
```

lion-frame の **RBAC ロールが `lion:role` カスタムクレーム**として入っており、RP 側はこれを使って画面出し分けや API ガードを実装できる。

#### Phase 3 で学んだこと・気づいたこと

##### 1. Provider 抽象化の威力

Phase 2 の時点で `resolveProvider(key)` を噛ませて issuer / client_id / client_secret を外に出していたおかげで、Phase 3 は **設定ファイル 1 ファイル + UI 1 ファイル** の追加だけで完結した。`/api/oidc/auth` と `/api/oidc/callback` に「もし LionFrame なら〜」のような分岐は 1 行も無い。OIDC が **プロトコルとして標準化されている**ことの実利を、コード上の差分量として体感できた。

##### 2. Discovery の `issuer` クレームと fetch URL は別物

lion-frame の Discovery Document は `http://localhost:3000/api/oidc/.well-known/openid-configuration` から取得するが、返ってくる JSON の `issuer` は `http://localhost:3000`（末尾の `/api/oidc` は含まれない）。jose の `jwtVerify({ issuer })` は **Discovery から返った issuer** を使って ID Token の `iss` クレームと比較するので、fetch 側の URL 基点と ID Token の `iss` がズレていても検証は通る。仕様上これは正常で、「discovery の置き場所」と「iss の値」は別々に決められる。

##### 3. ポート衝突と `redirect_uri` 完全一致

lion-frame が :3000 を占有するので oidc-demo 側は :3001 で起動する必要がある。このとき:

- `NEXTAUTH_URL=http://localhost:3001` を `.env.local` に設定
- lion-frame 側 `OIDCClient.redirectUris` に `http://localhost:3001/api/oidc/callback` を登録
- Google 側にも（再検証する場合）`http://localhost:3001/api/oidc/callback` を追加

3 か所すべてを同じ文字列で揃える必要があり、**一文字でも違うと `invalid_request` か `invalid_grant`**。Phase 2 の OP 実装で「redirect_uri は完全一致で検証する」と書いた通りの挙動に、今度は RP 側の運用者として従うことになる。

##### 4. client_secret 運用の落とし穴

lion-frame の管理 UI で発行される `client_secret` は `randomBytes(32).toString("base64url")` = 43 文字。モーダルの input が狭くて末尾 1 文字が視認できず、ドラッグ選択で **42 文字** の欠けた値をコピーすると `invalid_client` で弾かれる。仕様上の原因は bcrypt での不一致、運用上の原因は UX。IdP 側の改善ポイントとして lion-frame に持ち帰り。コピーボタン経由なら問題なし。

##### 5. カスタムクレームの設計判断

`lion:role` のように **コロン区切りの名前空間プレフィックス**を付けているのは、標準クレーム (`name`, `email` 等) との衝突を避ける OIDC の慣例（例: Auth0 の `https://myapp.com/role`）。RP 側で読むときは `idTokenPayload["lion:role"]` のように動的アクセスが必要だが、将来的に別の IdP（Auth0 / Okta 等）に差し替える際も、`lion:` プレフィックスが付いた値だけ lion-frame 由来と分かる。

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
    client-providers.ts          # Provider 切替 (Google / Local / LionFrame)
    oidc-client.ts               # Discovery 取得、認可 URL 構築、コード交換、UserInfo 取得
    oidc-provider.ts             # 鍵管理、クライアント/ユーザー/コード/トークン、ID Token 発行
    jwt-utils.ts                 # JWT デコード・検証 (jose)
    crypto-utils.ts              # state/nonce/PKCE 生成
    flow-store.ts                # フローイベントのインメモリ記録
    types.ts                     # 型定義
```

## ライセンス

Private
