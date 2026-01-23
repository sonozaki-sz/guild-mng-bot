# Oracle Cloud デプロイ - クイックリファレンス

このガイドは、Oracle Cloud Instanceのセットアップとデプロイを効率的に実行するためのクイックリファレンスです。

## 📁 用意されているスクリプト

| スクリプト | 実行場所 | 説明 |
|-----------|---------|------|
| `scripts/show-secrets-info.sh` | ローカル | GitHub Secrets設定ガイドを表示 |
| `scripts/deploy-initial.sh` | ローカル | 初回デプロイを自動実行 |
| `scripts/setup-oracle-instance.sh` | リモート | Oracle Instance環境構築 |

## 🚀 最短デプロイ手順

### ステップ1: GitHub Secrets設定

```bash
# ローカルマシンで実行
./scripts/show-secrets-info.sh
```

表示される情報に従って、GitHubリポジトリのSettingsで5つのSecretsを設定:
- `ORACLE_SSH_PRIVATE_KEY`
- `ORACLE_HOST`
- `ORACLE_USER`
- `DISCORD_TOKEN`
- `DISCORD_APP_ID`

### ステップ2: 初回デプロイ（自動）

```bash
# ローカルマシンで実行
export ORACLE_HOST="YOUR_PUBLIC_IP"  # Oracle CloudのPublic IP
./scripts/deploy-initial.sh
```

このスクリプトが自動実行:
1. SSH接続テスト
2. サーバー環境構築（Docker, Git, ファイアウォール）
3. リポジトリクローン
4. .envファイル作成
5. データベース転送

### ステップ3: .env設定とBot起動

```bash
# Oracle Instanceにログイン
ssh ubuntu@YOUR_PUBLIC_IP

# .envファイル編集
cd ~/guild-mng-bot
nano .env
```

**.env の内容** (TOKENとAPP_IDを実際の値に変更):
```bash
TOKEN="YOUR_DISCORD_TOKEN_HERE"
APP_ID="YOUR_DISCORD_APP_ID_HERE"
LOCALE="ja"
DATABASE_URL="sqlite://storage/db.sqlite"
```

保存: `Ctrl+O` → Enter → `Ctrl+X`

```bash
# Bot起動
docker compose up -d

# ログ確認
docker compose logs -f
```

### ステップ4: GitHub Actions自動デプロイ確認

```bash
# ローカルマシンで実行
cd /home/shun/dev/guild-mng-bot
git checkout main
git push origin main
```

GitHubのActionsタブで自動デプロイを確認。

---

## 🔧 トラブルシューティング

### SSH接続エラー

```bash
# 秘密鍵のパーミッション確認
chmod 600 ~/.ssh/id_rsa

# SSH接続テスト
ssh -v ubuntu@YOUR_PUBLIC_IP
```

### Docker権限エラー

```bash
# 再ログインしてDockerグループを適用
exit
ssh ubuntu@YOUR_PUBLIC_IP

# 確認
docker ps
```

### Bot起動エラー

```bash
# ログ詳細確認
docker compose logs --tail=100

# .env確認
cat .env

# コンテナ再起動
docker compose restart

# 完全再ビルド
docker compose down
docker compose up -d --build
```

### データベースエラー

```bash
# データベースファイル確認
ls -lh ~/guild-mng-bot/storage/db.sqlite

# パーミッション修正
chmod 644 ~/guild-mng-bot/storage/db.sqlite
```

---

## 📋 よく使うコマンド

### ローカル → リモート

```bash
# ファイル転送
scp -i ~/.ssh/id_rsa local-file ubuntu@HOST:~/guild-mng-bot/

# データベース転送
scp -i ~/.ssh/id_rsa storage/db.sqlite ubuntu@HOST:~/guild-mng-bot/storage/

# ディレクトリ転送
scp -r -i ~/.ssh/id_rsa local-dir ubuntu@HOST:~/guild-mng-bot/
```

### リモートでの操作

```bash
# SSH接続
ssh ubuntu@YOUR_PUBLIC_IP

# Bot管理
cd ~/guild-mng-bot
docker compose ps           # ステータス確認
docker compose logs -f      # ログ監視
docker compose restart      # 再起動
docker compose down         # 停止
docker compose up -d        # 起動

# システム情報
df -h                       # ディスク使用量
free -h                     # メモリ使用量
docker system df            # Docker使用量

# ログクリーンアップ
docker system prune -a      # 未使用イメージ削除
```

### GitHub Actions

```bash
# ローカルでプッシュ（自動デプロイトリガー）
git add .
git commit -m "Update: ..."
git push origin main

# ワークフローログ確認
# GitHub → Actions タブで確認
```

---

## 🎯 デプロイ後のチェックリスト

- [ ] BotがDiscordでオンラインになっている
- [ ] `/help` コマンドが動作する
- [ ] データベースのデータが保持されている
- [ ] `docker compose logs` でエラーがない
- [ ] GitHub Actionsの自動デプロイが成功する

---

## 📚 詳細ドキュメント

詳しい手順は以下を参照:
- [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) - 詳細セットアップ手順
- [ORACLE_CLOUD_SETUP.md](ORACLE_CLOUD_SETUP.md) - Oracle Cloud完全ガイド
- [../GITHUB_SECRETS_SETUP.md](../GITHUB_SECRETS_SETUP.md) - GitHub Secrets詳細
- [../REFACTORING_PLAN.md](../REFACTORING_PLAN.md) - 全体計画
