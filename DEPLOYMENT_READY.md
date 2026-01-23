# Oracle Cloud デプロイ準備完了サマリー

## ✅ 作成されたファイル

### 📝 ドキュメント
- [docs/deployment/SETUP_CHECKLIST.md](docs/deployment/SETUP_CHECKLIST.md) - 詳細なセットアップ手順チェックリスト
- [docs/deployment/QUICK_START.md](docs/deployment/QUICK_START.md) - クイックスタートガイド

### 🔧 スクリプト
- [scripts/show-secrets-info.sh](scripts/show-secrets-info.sh) - GitHub Secrets設定ガイド表示
- [scripts/deploy-initial.sh](scripts/deploy-initial.sh) - 初回デプロイ自動化スクリプト
- [scripts/setup-oracle-instance.sh](scripts/setup-oracle-instance.sh) - Oracle Instance環境構築スクリプト

### ⚙️ 設定ファイル更新
- [docker-compose.yml](docker-compose.yml) - bind mount対応、restart policy追加
- [.github/workflows/deploy.yml](.github/workflows/deploy.yml) - デプロイワークフロー最適化
- [README.md](README.md) - クイックスタートセクション追加

---

## 🎯 次に実行すること

### Phase 1: GitHub Secrets設定

```bash
# 1. Secrets設定ガイドを表示
./scripts/show-secrets-info.sh

# 2. GitHub Settingsで以下を設定
# https://github.com/sonozakiSZ/guild-mng-bot/settings/secrets/actions
```

必要なSecrets:
- ✅ `ORACLE_SSH_PRIVATE_KEY` - SSH秘密鍵（`cat ~/.ssh/id_rsa`）
- ✅ `ORACLE_HOST` - Public IP（Oracle Cloud ConsoleのInstance Details）
- ✅ `ORACLE_USER` - `ubuntu`
- ✅ `DISCORD_TOKEN` - Botトークン（Discord Developer Portal）
- ✅ `DISCORD_APP_ID` - アプリケーションID（Discord Developer Portal）

### Phase 2: 初回デプロイ実行

```bash
# Oracle CloudのPublic IPを環境変数に設定
export ORACLE_HOST="123.456.789.012"  # 実際のIPに置き換え

# 自動デプロイスクリプト実行
./scripts/deploy-initial.sh
```

このスクリプトが以下を自動実行:
1. ✅ SSH接続テスト
2. ✅ サーバー環境構築（Docker, Git, ファイアウォール）
3. ✅ リポジトリクローン
4. ✅ .envファイル作成
5. ✅ データベース転送

### Phase 3: Bot起動

```bash
# Oracle Instanceにログイン
ssh ubuntu@YOUR_PUBLIC_IP

# .envファイルを編集
cd ~/guild-mng-bot
nano .env
```

**.env** の内容（TOKENとAPP_IDを実際の値に変更）:
```bash
TOKEN="YOUR_DISCORD_TOKEN_HERE"
APP_ID="YOUR_DISCORD_APP_ID_HERE"
LOCALE="ja"
DATABASE_URL="sqlite://storage/db.sqlite"
```

```bash
# Bot起動
docker compose up -d

# ログ確認
docker compose logs -f
```

### Phase 4: GitHub Actions自動デプロイ確認

```bash
# ローカルで変更をプッシュ
git add .
git commit -m "feat: Oracle Cloud deployment setup"
git push origin main
```

GitHubのActionsタブで自動デプロイを確認。

---

## 📋 トラブルシューティング

### SSH接続できない
```bash
# 秘密鍵のパーミッション確認
chmod 600 ~/.ssh/id_rsa

# Security List設定確認（OCI Console）
# Ingress Rule: 0.0.0.0/0, TCP, Port 22
```

### Docker権限エラー
```bash
# 再ログインしてDockerグループ適用
exit
ssh ubuntu@YOUR_PUBLIC_IP
docker ps  # 確認
```

### Bot起動エラー
```bash
# ログ確認
docker compose logs --tail=100

# .env確認
cat .env

# 再起動
docker compose restart
```

---

## 🔗 参考リンク

- **Oracle Cloud Console**: https://cloud.oracle.com/
- **Discord Developer Portal**: https://discord.com/developers/applications
- **GitHub Secrets設定**: https://github.com/sonozakiSZ/guild-mng-bot/settings/secrets/actions
- **GitHub Actions**: https://github.com/sonozakiSZ/guild-mng-bot/actions

---

## 📚 詳細ドキュメント

すべての手順の詳細は以下を参照:
- [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) - ステップバイステップチェックリスト
- [ORACLE_CLOUD_SETUP.md](ORACLE_CLOUD_SETUP.md) - Oracle Cloud完全ガイド
- [QUICK_START.md](QUICK_START.md) - クイックリファレンス
- [../GITHUB_SECRETS_SETUP.md](../GITHUB_SECRETS_SETUP.md) - GitHub Secrets詳細
- [../REFACTORING_PLAN.md](../REFACTORING_PLAN.md) - 全体リファクタリング計画

---

## ✨ 完了後の確認項目

- [ ] BotがDiscordでオンライン表示
- [ ] `/help` コマンドが動作
- [ ] データベースのデータが保持されている
- [ ] GitHub Actionsの自動デプロイが成功
- [ ] `docker compose logs` でエラーなし

すべて完了したら、[REFACTORING_PLAN.md](../REFACTORING_PLAN.md) の **Phase 2** に進んでください！
