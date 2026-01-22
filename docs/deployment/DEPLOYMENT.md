# デプロイメント手順書（Oracle Cloud Always Free）

## 概要

guild-mng-botをOracle Cloud Always Free（ARM Ampere A1）にDocker Composeでデプロイする手順を説明します。

## 前提条件

- Oracle Cloud アカウント（無料）
- GitHub リポジトリ
- Discord Bot トークン
- SSH公開鍵

---

## Oracle Cloud セットアップ

### 1. Compute Instance作成

#### インスタンス設定
- **名前**: `guild-mng-bot`
- **イメージ**: Ubuntu 22.04 Minimal (Always Free対象)
- **シェイプ**: VM.Standard.A1.Flex (Arm)
  - OCPU: **1**
  - メモリ: **6GB**
- **ブートボリューム**: 47GB (デフォルト)
- **ネットワーク**: パブリックIPアドレス割当て有効
- **SSHキー**: 公開鍵をアップロード

#### ファイアウォール設定

**セキュリティ・リスト（OCI側）**:
1. VCN → サブネット → セキュリティ・リスト
2. イングレス・ルール追加:
   - ソース: `0.0.0.0/0`
   - プロトコル: TCP
   - ポート: `80,443,3000`

**インスタンス内ファイアウォール**:
```bash
ssh ubuntu@<パブリックIP>

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

---

## 環境構築

### 2. Docker & Docker Composeインストール

```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# Dockerインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# ユーザーをdockerグループに追加
sudo usermod -aG docker $USER
newgrp docker

# Docker Composeインストール
sudo apt install docker-compose-plugin -y

# 確認
docker --version
docker compose version
```

### 3. プロジェクトセットアップ

```bash
# クローン
cd ~
git clone https://github.com/sonozakiSZ/guild-mng-bot.git
cd guild-mng-bot

# ストレージ作成
mkdir -p storage/logs
chmod -R 755 storage

# 【重要】既存環境（ArgoCD）からのデータ移行
# ArgoCD WebUIからターミナルを起動してJSONデータをエクスポート
# 1. ArgoCD WebUI → Pod → Terminal起動
# 2. コンテナ内でデータエクスポート（例）:
#    cat /app/storage/db.sqlite | base64 > db.sqlite.base64
#    または、SQLiteをJSONにダンプ:
#    sqlite3 /app/storage/db.sqlite .dump > data.sql
# 3. ターミナルからコピー＆ペーストでローカルに保存
# 4. ローカルでdb.sqliteを復元:
#    base64 -d db.sqlite.base64 > db.sqlite
#    または:
#    sqlite3 db.sqlite < data.sql
# 5. Oracle Cloudにアップロード:
#    scp ./db.sqlite ubuntu@<Oracle CloudパブリックIP>:~/guild-mng-bot/storage/
# 6. Oracle Cloud側で権限設定:
#    chmod 644 storage/db.sqlite

# 環境変数設定
nano .env
```

**.env**:
```env
DISCORD_TOKEN=your-bot-token
DISCORD_APP_ID=your-app-id
NODE_ENV=production
LOG_LEVEL=info
LOCALE=ja
DATABASE_URL=sqlite:///app/storage/db.sqlite
```

---

## デプロイ

### 4. Docker Compose設定

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  bot:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: guild-mng-bot
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_APP_ID=${DISCORD_APP_ID}
      - NODE_ENV=${NODE_ENV}
      - LOG_LEVEL=${LOG_LEVEL}
      - LOCALE=${LOCALE}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./storage:/app/storage
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

### 5. 起動

> **⚠️ 重要**: 初回起動前に、必ず既存環境からdb.sqliteを`storage/`に配置してください。
> データがないと全ギルド設定が失われます。

```bash
# データ移行の確認
ls -lh storage/db.sqlite

# ビルド
docker compose build

# 起動
docker compose up -d

# ログ確認
docker compose logs -f

# ステータス確認
docker compose ps
```

---

## 運用

### 更新デプロイ

```bash
cd ~/guild-mng-bot

# 最新コード取得
git pull origin main

# 再ビルド & 再起動
docker compose down
docker compose build
docker compose up -d
```

### ログ確認

```bash
# リアルタイムログ
docker compose logs -f

# 過去ログ
docker compose logs --tail=100

# エラーログのみ
docker compose logs | grep ERROR

# ファイルログ
ls -lh storage/logs/
cat storage/logs/app-$(date +%Y-%m-%d).log
```

### バックアップ

```bash
# データベースバックアップ
cp storage/db.sqlite storage/db-backup-$(date +%Y%m%d).sqlite

# 定期バックアップ（cron）
crontab -e
```

```cron
# 毎日3時にバックアップ
0 3 * * * cd ~/guild-mng-bot && cp storage/db.sqlite storage/db-backup-$(date +\%Y\%m\%d).sqlite
```

### トラブルシューティング

```bash
# コンテナ再起動
docker compose restart

# コンテナ再作成
docker compose down
docker compose up -d

# コンテナ内シェル
docker exec -it guild-mng-bot sh

# リソース確認
docker stats

# ディスク使用量
df -h
du -sh ~/guild-mng-bot/storage
```

---

## GitHub Actions CI/CD（オプション）

### ワークフロー設定

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Oracle Cloud

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ubuntu
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/guild-mng-bot
            git pull origin main
            docker compose down
            docker compose build
            docker compose up -d
```

### Secrets設定

GitHub リポジトリ → Settings → Secrets and variables → Actions:
- `SSH_HOST`: Oracle CloudインスタンスのパブリックIP
- `SSH_PRIVATE_KEY`: SSH秘密鍵

---

## モニタリング

### ヘルスチェック

```bash
# ローカル
curl http://localhost:3000/health

# 外部から
curl http://<パブリックIP>:3000/health
```

### リソース監視

```bash
# CPU/メモリ使用率
top
htop

# Docker統計
docker stats

# ディスク使用量
df -h
```

### アラート設定（オプション）

UptimeRobot、Better Uptime等の外部サービスで監視可能。

---

## 注意事項

### Always Free制限

- **アイドル自動停止**: 7日間連続でCPU/ネットワーク/メモリ < 20%の場合、インスタンスが回収される可能性
  - Discord BotはWebSocket常時接続のため、通常は該当しない
- **リソース上限**: 1 OCPU / 6GB RAM / 47GB ストレージ
- **帯域**: 月10TB（十分）

### バックアップ推奨

- 定期的にDBをローカルにダウンロード
- ブートボリュームのスナップショット作成（無料枠5個まで）

---

## まとめ

- **コスト**: 完全無料（Oracle Cloud Always Free）
- **性能**: 1 OCPU / 6GB RAM（Discord Bot十分）
- **永続化**: ローカルストレージ（47GB）
- **可用性**: 単一インスタンス（ダウンタイムあり）

将来的にWebUI実装時は、リソースを増やすか、別インスタンスを検討。
