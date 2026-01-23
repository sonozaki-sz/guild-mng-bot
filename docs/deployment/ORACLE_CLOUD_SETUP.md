# Oracle Cloud デプロイ実行手順

## 前提条件チェックリスト

- [ ] Oracle Cloud アカウント作成済み
- [ ] Discord Bot トークン取得済み
- [ ] Discord Bot アプリケーションID取得済み
- [ ] SSH公開鍵/秘密鍵ペア生成済み

---

## Step 1: Oracle Cloud Compute Instance作成

### 1.1 インスタンス作成

1. **Oracle Cloud Console** → **Compute** → **Instances** → **Create Instance**

2. **基本情報**:
   - Name: `guild-mng-bot`
   - Compartment: (ルートまたは任意)

3. **Image and Shape**:
   - **Image**: Ubuntu 22.04 Minimal
   - **Shape**: VM.Standard.A1.Flex (ARM - Always Free対象)
     - OCPU: **1** (Always Free範囲内)
     - Memory: **6GB** (Always Free範囲内)

4. **Networking**:
   - VCN: デフォルトVCNまたは新規作成
   - Subnet: パブリックサブネット
   - **Assign a public IPv4 address**: ✅ チェック

5. **SSH Keys**:
   - **Upload public key files (.pub)** を選択
   - 公開鍵ファイル（`~/.ssh/id_rsa.pub` など）をアップロード

6. **Boot Volume**: デフォルト（47GB）

7. **Create** をクリック

### 1.2 パブリックIPアドレスを控える

インスタンス作成後、**Instance Details** → **Public IP address** をコピーして控える。

例: `123.456.789.012`

---

## Step 2: ファイアウォール設定

### 2.1 OCI側のセキュリティリスト設定

1. **VCN** → 使用中のサブネット → **Security Lists**
2. デフォルトのセキュリティリストを選択
3. **Add Ingress Rules**:

| ソースCIDR | プロトコル | ポート | 説明 |
|-----------|----------|-------|------|
| 0.0.0.0/0 | TCP | 22 | SSH |
| 0.0.0.0/0 | TCP | 80 | HTTP (将来のWebUI用) |
| 0.0.0.0/0 | TCP | 443 | HTTPS (将来のWebUI用) |

### 2.2 インスタンス内ファイアウォール設定

インスタンスにSSH接続:
```bash
ssh -i ~/.ssh/id_rsa ubuntu@<パブリックIP>
```

ファイアウォールルール追加:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## Step 3: サーバー環境構築

### 3.1 システム更新
```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Docker & Docker Compose インストール
```bash
# Dockerインストール
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# ユーザーをdockerグループに追加
sudo usermod -aG docker $USER
newgrp docker

# Docker Composeプラグインインストール
sudo apt install docker-compose-plugin -y

# 確認
docker --version
docker compose version
```

### 3.3 リポジトリクローン
```bash
cd ~
git clone https://github.com/sonozakiSZ/guild-mng-bot.git
cd guild-mng-bot
```

---

## Step 4: データベース転送

### 4.1 ローカルからOracle Cloudへdb.sqlite転送

**ローカルマシンで実行**:
```bash
cd /home/shun/dev/guild-mng-bot

# db.sqliteを転送
scp -i ~/.ssh/id_rsa storage/db.sqlite ubuntu@<パブリックIP>:~/guild-mng-bot/storage/

# 権限設定（Oracle Cloud側で実行）
ssh -i ~/.ssh/id_rsa ubuntu@<パブリックIP>
cd ~/guild-mng-bot
chmod 644 storage/db.sqlite
ls -lh storage/
exit
```

---

## Step 5: 環境変数設定

### 5.1 .envファイル作成

**Oracle Cloud Instanceで実行**:
```bash
ssh -i ~/.ssh/id_rsa ubuntu@<パブリックIP>
cd ~/guild-mng-bot

# .envファイル作成
cp .env.example .env
nano .env
```

### 5.2 .envファイル編集

```env
TOKEN="<Discord Botのトークン>"
APP_ID="<Discord BotのアプリケーションID>"
LOCALE="ja"
DATABASE_URL="sqlite://storage/db.sqlite"
```

**保存**: `Ctrl + O` → `Enter` → `Ctrl + X`

---

## Step 6: 初回デプロイ

### 6.1 Dockerイメージビルド
```bash
cd ~/guild-mng-bot
docker compose build
```

### 6.2 起動
```bash
docker compose up -d
```

### 6.3 ログ確認
```bash
docker compose logs -f
```

**確認項目**:
- ✅ `guild-mng-bot`がログインしました
- ✅ Slash commands registered
- ✅ エラーなし

### 6.4 コンテナ状態確認
```bash
docker compose ps
```

**期待される出力**:
```
NAME              IMAGE                             STATUS
guild-mng-bot     ghcr.io/sonozakisz/guild-mng-bot  Up
```

---

## Step 7: Discord動作確認

1. **Discordサーバー**でBotがオンラインか確認
2. **コマンド実行**:
   ```
   /status-list
   ```
3. **設定が表示されることを確認**:
   - AFK VC設定
   - VC Auto Creation設定
   - Leave Member Log設定
   - Stick Message設定
   - Bump Reminder設定

---

## Step 8: GitHub Secrets設定（自動デプロイ用）

[GITHUB_SECRETS_SETUP.md](GITHUB_SECRETS_SETUP.md)を参照して、以下のSecretsを設定:

1. `ORACLE_SSH_PRIVATE_KEY`: SSH秘密鍵
2. `ORACLE_HOST`: パブリックIP
3. `ORACLE_USER`: `ubuntu`
4. `DISCORD_TOKEN`: Botトークン
5. `DISCORD_APP_ID`: アプリケーションID

---

## Step 9: 自動デプロイテスト

### 9.1 手動ワークフロー実行

1. **GitHub** → **Actions** → **Deploy to Oracle Cloud**
2. **Run workflow** → **Run workflow** (mainブランチ)
3. ワークフローが成功することを確認

### 9.2 自動デプロイ確認

```bash
# ローカルで変更をmainにマージ
git checkout main
git merge refactor/webui-ready
git push origin main
```

GitHub Actionsが自動実行され、Oracle Cloudへデプロイされることを確認。

---

## トラブルシューティング

### Botが起動しない
```bash
docker compose logs --tail=100
```

エラーメッセージを確認:
- **Invalid token**: `.env`のTOKENを確認
- **Database error**: `storage/db.sqlite`の存在と権限を確認

### コンテナが停止する
```bash
docker compose ps -a
docker compose logs
```

### SSH接続できない
- パブリックIPが正しいか確認
- セキュリティリストでポート22が開いているか確認
- SSH鍵のパーミッション確認: `chmod 600 ~/.ssh/id_rsa`

---

## 完了チェックリスト

- [ ] Oracle Cloud Instance作成完了
- [ ] Docker環境構築完了
- [ ] db.sqlite転送完了
- [ ] Bot起動成功
- [ ] Discord動作確認成功
- [ ] GitHub Secrets設定完了
- [ ] 自動デプロイ成功

---

## 次のステップ

✅ **Phase 1完了** → **Phase 4完了** により、以下が実現:
- Oracle Cloudで本番稼働
- mainブランチpushで自動デプロイ
- データ永続化（コンテナ再起動に耐える）

次は **Phase 2: 基盤リファクタリング**（Winston, Zod, エラーハンドリング統一）を実施可能。
