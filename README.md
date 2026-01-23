# guild-mng-bot

Discord サーバー管理Botです。

## 📖 ドキュメント

- **デプロイ手順**: [docs/deployment/QUICK_START.md](docs/deployment/QUICK_START.md) - Oracle Cloudへの最短デプロイ手順
- **リファクタリング計画**: [docs/REFACTORING_PLAN.md](docs/REFACTORING_PLAN.md)
- **アーキテクチャ**: [docs/design/ARCHITECTURE.md](docs/design/ARCHITECTURE.md)

## 🚀 クイックスタート（Oracle Cloud）

### 1. GitHub Secrets設定

```bash
./scripts/show-secrets-info.sh
```

### 2. 初回デプロイ

```bash
export ORACLE_HOST="YOUR_PUBLIC_IP"
./scripts/deploy-initial.sh
```

### 3. Bot起動

```bash
ssh ubuntu@YOUR_PUBLIC_IP
cd ~/guild-mng-bot
nano .env  # TOKENとAPP_IDを設定
docker compose up -d
```

詳細: [docs/deployment/QUICK_START.md](docs/deployment/QUICK_START.md)

---

## 💻 ローカル開発

## 事前準備
1. .env.exampleを参考にBotのトークンなどを記載した.envファイルをプロジェクトルートディレクトリに作成する。

## 環境構築
### 開発環境
```bash
$ pnpm i --frozen-lockfile
```

### 本番環境
```bash
$ pnpm i --frozen-lockfile
$ pnpm run build
$ pnpm i --frozen-lockfile -P
```

## 実行
### 開発環境
```bash
$ pnpm run dev
```

### 本番環境
```bash
$ pnpm start
```

### Docker
```bash
$ docker compose up
```
