# デプロイメント手順書

## 概要

guild-mng-botをFly.ioに自動デプロイする手順と、CI/CD設定について説明します。

## 前提条件

- [x] Fly.io アカウント作成済み
- [x] Fly CLI インストール済み
- [x] GitHub リポジトリ準備完了
- [x] Discord Bot トークン取得済み

## Fly.io初期セットアップ

### 1. Fly CLIインストール

```bash
# Linux/WSL
curl -L https://fly.io/install.sh | sh

# 確認
fly version
```

### 2. ログイン

```bash
fly auth login
```

### 3. アプリケーション作成

```bash
# プロジェクトルートで実行
cd /path/to/guild-mng-bot

# Fly.ioアプリ作成
fly apps create guild-mng-bot

# または対話式
fly launch --no-deploy
```

### 4. PostgreSQLデータベース作成

```bash
# Postgresアプリ作成
fly postgres create --name guild-mng-bot-db

# 接続情報の確認
fly postgres connect -a guild-mng-bot-db

# 接続文字列を取得（後で使用）
fly postgres config show -a guild-mng-bot-db
```

### 5. データベース接続設定

```bash
# DATABASE_URLをSecretに設定
fly secrets set DATABASE_URL="postgres://postgres:password@guild-mng-bot-db.internal:5432/guild_mng_bot" -a guild-mng-bot
```

### 6. その他のSecrets設定

```bash
# Discord設定
fly secrets set DISCORD_TOKEN="your-discord-token" -a guild-mng-bot
fly secrets set DISCORD_APP_ID="your-app-id" -a guild-mng-bot

# その他
fly secrets set NODE_ENV="production" -a guild-mng-bot
fly secrets set LOG_LEVEL="info" -a guild-mng-bot
fly secrets set LOCALE="ja" -a guild-mng-bot

# 確認
fly secrets list -a guild-mng-bot
```

## fly.toml設定

### 基本設定

```toml
# fly.toml

app = "guild-mng-bot"
primary_region = "nrt" # 東京リージョン

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false  # Botは常時稼働
  auto_start_machines = true
  min_machines_running = 1

  [[http_service.checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"

[deploy]
  release_command = "npx prisma migrate deploy"

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[metrics]
  port = 9091
  path = "/metrics"
```

### リソース設定

```toml
[vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512  # 無料枠の範囲内
```

## Dockerfile最適化

```dockerfile
# Dockerfile（本番用最適化版）

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# 依存関係インストール層（キャッシュ効率化）
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ビルド層
FROM base AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build && \
    npx prisma generate

# 本番実行層（最小サイズ）
FROM base AS runner
WORKDIR /app

# 本番ユーザー作成（セキュリティ）
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 botuser

# 必要なファイルのみコピー
COPY --from=deps --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=botuser:nodejs /app/.build ./.build
COPY --from=build --chown=botuser:nodejs /app/prisma ./prisma
COPY --chown=botuser:nodejs package.json ./

USER botuser

EXPOSE 3000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", ".build/src/index.js"]
```

## 手動デプロイ

### 初回デプロイ

```bash
# ビルドとデプロイ
fly deploy

# ログ確認
fly logs -a guild-mng-bot

# ステータス確認
fly status -a guild-mng-bot

# マシン確認
fly machine list -a guild-mng-bot
```

### マイグレーション実行

```bash
# SSH接続
fly ssh console -a guild-mng-bot

# コンテナ内でマイグレーション
npx prisma migrate deploy
exit
```

### スケーリング

```bash
# マシン数変更
fly scale count 1 -a guild-mng-bot

# メモリ変更
fly scale memory 512 -a guild-mng-bot
```

## GitHub Actions CI/CD

### ワークフロー設定

```yaml
# .github/workflows/deploy.yml

name: Deploy to Fly.io

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy app
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Fly
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy to Fly.io
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Notify deployment
        if: success()
        run: |
          echo "✅ Deployment successful"
          # Discord Webhookで通知も可能

      - name: Notify failure
        if: failure()
        run: |
          echo "❌ Deployment failed"
```

### GitHub Secrets設定

```bash
# Fly.io トークン取得
fly auth token

# GitHub リポジトリの Settings > Secrets and variables > Actions に追加
# FLY_API_TOKEN = <取得したトークン>
```

## ステージング環境設定（オプション）

### fly.staging.toml

```toml
# fly.staging.toml

app = "guild-mng-bot-staging"
primary_region = "nrt"

# 本番と同じ設定だが、アプリ名が異なる
[build]
  dockerfile = "Dockerfile"

# ... 他の設定は fly.toml と同様
```

### ステージングデプロイ

```bash
# ステージング用アプリ作成
fly apps create guild-mng-bot-staging

# ステージング用DB作成
fly postgres create --name guild-mng-bot-staging-db

# Secrets設定（本番とは別）
fly secrets set DISCORD_TOKEN="staging-token" -a guild-mng-bot-staging

# デプロイ
fly deploy --config fly.staging.toml
```

## モニタリング

### ログ確認

```bash
# リアルタイムログ
fly logs -a guild-mng-bot

# 過去のログ
fly logs -a guild-mng-bot --since 1h

# エラーログのみ
fly logs -a guild-mng-bot | grep ERROR
```

### メトリクス確認

```bash
# Fly.io ダッシュボードで確認
fly open -a guild-mng-bot

# または Grafana Cloud連携（有料）
```

### アラート設定

Fly.io Dashboard で設定：
- CPU使用率 > 80% でアラート
- メモリ使用率 > 90% でアラート
- ヘルスチェック失敗時にアラート

## トラブルシューティング

### デプロイ失敗時

```bash
# デバッグモードでログ確認
fly logs -a guild-mng-bot --verbose

# コンテナに直接SSH
fly ssh console -a guild-mng-bot

# マシンを再起動
fly machine restart <machine-id> -a guild-mng-bot
```

### データベース接続エラー

```bash
# DB接続確認
fly postgres connect -a guild-mng-bot-db

# 接続文字列確認
fly secrets list -a guild-mng-bot

# DBステータス確認
fly status -a guild-mng-bot-db
```

### Bot起動失敗

```bash
# ログでエラー確認
fly logs -a guild-mng-bot | tail -100

# Secrets確認
fly secrets list -a guild-mng-bot

# 環境変数確認
fly ssh console -a guild-mng-bot
env | grep DISCORD
```

## ロールバック手順

### 前バージョンへの復元

```bash
# リリース履歴確認
fly releases -a guild-mng-bot

# 特定バージョンにロールバック
fly releases rollback <version> -a guild-mng-bot

# 最新の安定版にロールバック
fly releases rollback -a guild-mng-bot
```

## バックアップとリストア

### データベースバックアップ

```bash
# 手動バックアップ
fly postgres connect -a guild-mng-bot-db
pg_dump guild_mng_bot > backup_$(date +%Y%m%d).sql
exit

# 自動バックアップ（Fly.ioが自動実行）
# 7日間保持
```

### リストア

```bash
# バックアップからリストア
fly postgres connect -a guild-mng-bot-db
psql guild_mng_bot < backup_20260122.sql
exit
```

## コスト管理

### 無料枠の範囲

- **Compute**: 3 shared-cpu-1x VMs (256MB RAM) 無料
- **Postgres**: 3GB storage 無料
- **Bandwidth**: 100GB/月 無料

### 現構成のコスト（見積もり）

- Bot: 1x shared-cpu-1x (512MB) → 無料枠内
- Postgres: 1GB使用 → 無料枠内
- **月額**: $0（無料枠内）

### コスト超過時の対策

1. メモリを256MBに削減
2. Auto-stopを有効化（Botには不向き）
3. Renderなど他のプラットフォーム検討

## セキュリティ

### Secrets管理

```bash
# Secretsは暗号化されて保存
# .envファイルはGitにコミットしない

# Secretsローテーション
fly secrets set DISCORD_TOKEN="new-token" -a guild-mng-bot
```

### ネットワークセキュリティ

```toml
# fly.toml でHTTPS強制
[http_service]
  force_https = true
```

### アクセス制限

```bash
# IP制限（必要に応じて）
fly ips list -a guild-mng-bot
```

## 運用チェックリスト

### デプロイ前
- [ ] ローカルでビルド成功
- [ ] ローカルでBot動作確認
- [ ] マイグレーションテスト済み
- [ ] 環境変数確認

### デプロイ後
- [ ] ヘルスチェック成功
- [ ] Bot正常起動
- [ ] ログにエラーなし
- [ ] コマンド動作確認
- [ ] DB接続確認

### 定期メンテナンス
- [ ] 週次: ログ確認
- [ ] 月次: バックアップ確認
- [ ] 月次: コスト確認
- [ ] 四半期: セキュリティ更新

## まとめ

このデプロイメント構成により：

✅ **自動化**: GitHub pushで自動デプロイ
✅ **安全性**: ロールバック可能、バックアップあり
✅ **無料**: 無料枠内で運用可能
✅ **監視**: ログ・メトリクスで状態監視

Fly.ioの無料枠で24時間稼働のDiscord Botを実現できます。
