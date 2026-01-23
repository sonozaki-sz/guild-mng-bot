# Oracle Cloud デプロイ実行チェックリスト

## 📋 実行前の準備

### ✅ 完了済み
- [x] Oracle Cloud アカウント作成
- [x] Discord Bot トークン取得
- [x] Discord Bot アプリケーションID取得
- [x] SSH公開鍵/秘密鍵ペア生成
- [x] Oracle Cloud Compute Instance作成

### 🔄 これから実行

---

## Step 1: Public IP取得とGitHub Secrets設定

### 1.1 Public IPアドレスの取得

1. **Oracle Cloud Console**にログイン
2. **Compute** → **Instances** → `guild-mng-bot`を選択
3. **Instance Details** → **Primary VNIC** → **Public IP address**をコピー

```
例: 123.456.789.012
```

### 1.2 GitHub Secretsに追加

1. GitHubリポジトリ `sonozakiSZ/guild-mng-bot`にアクセス
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret**をクリック

#### 必要なSecrets一覧

| Secret名 | 値 | 説明 |
|---------|---|------|
| `ORACLE_HOST` | `123.456.789.012` | 取得したパブリックIP |
| `ORACLE_USER` | `ubuntu` | SSHログインユーザー名 |
| `ORACLE_SSH_PRIVATE_KEY` | SSH秘密鍵の内容 | `cat ~/.ssh/id_rsa` |
| `DISCORD_TOKEN` | Bot トークン | Discord Developer Portal |
| `DISCORD_APP_ID` | アプリケーションID | Discord Developer Portal |

**確認コマンド**:
```bash
# ローカルマシンで確認
cat ~/.ssh/id_rsa  # 秘密鍵の内容をコピー
```

---

## Step 2: Security List設定

### 2.1 OCI側のIngress Rules追加

1. **Oracle Cloud Console** → **Networking** → **Virtual Cloud Networks**
2. 使用中のVCNを選択 → **Subnets** → 使用中のサブネットを選択
3. **Security Lists** → **Default Security List**を選択
4. **Add Ingress Rules**をクリック

#### 追加するルール

| SOURCE CIDR | IP Protocol | Source Port Range | Destination Port Range | 説明 |
|------------|------------|-------------------|----------------------|------|
| 0.0.0.0/0 | TCP | All | 22 | SSH |
| 0.0.0.0/0 | TCP | All | 80 | HTTP (WebUI用) |
| 0.0.0.0/0 | TCP | All | 443 | HTTPS (WebUI用) |

### 2.2 インスタンス内ファイアウォール設定

SSH接続してiptables設定:

```bash
# ローカルから接続
ssh -i ~/.ssh/id_rsa ubuntu@<ORACLE_HOST>

# ファイアウォールルール追加
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

# 設定確認
sudo iptables -L INPUT -n --line-numbers
```

---

## Step 3: SSH接続テストとサーバー環境構築

### 3.1 SSH接続確認

```bash
ssh -i ~/.ssh/id_rsa ubuntu@<ORACLE_HOST>
```

成功したら次へ進む。

### 3.2 システム更新

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Docker & Docker Compose インストール

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

**期待される出力**:
```
Docker version 24.x.x
Docker Compose version v2.x.x
```

### 3.4 必要なディレクトリ作成

```bash
mkdir -p ~/guild-mng-bot/storage
```

---

## Step 4: リポジトリクローン

### 4.1 Gitインストール（必要な場合）

```bash
sudo apt install git -y
git --version
```

### 4.2 リポジトリクローン

```bash
cd ~
git clone https://github.com/sonozakiSZ/guild-mng-bot.git
cd guild-mng-bot
```

### 4.3 .envファイル作成

```bash
# .env.exampleをコピー
cp .env.example .env

# .envを編集
nano .env
```

**.env の内容**:
```bash
TOKEN="YOUR_DISCORD_TOKEN_HERE"
APP_ID="YOUR_DISCORD_APP_ID_HERE"
LOCALE="ja"
DATABASE_URL="sqlite://storage/db.sqlite"
```

**保存方法**: `Ctrl+O` → Enter → `Ctrl+X`

---

## Step 5: データベース転送（SCP）

### 5.1 ローカルからデータベースファイルを転送

```bash
# ローカルマシンで実行
cd /home/shun/dev/guild-mng-bot

# ファイル存在確認
ls -lh storage/db.sqlite

# SCP転送
scp -i ~/.ssh/id_rsa storage/db.sqlite ubuntu@<ORACLE_HOST>:~/guild-mng-bot/storage/

# 転送確認
ssh -i ~/.ssh/id_rsa ubuntu@<ORACLE_HOST> "ls -lh ~/guild-mng-bot/storage/"
```

**期待される出力**:
```
-rw-r--r-- 1 ubuntu ubuntu XXXK ... db.sqlite
```

---

## Step 6: 初回デプロイとテスト

### 6.1 Docker Composeでビルド&起動

```bash
# Oracle Instanceで実行
cd ~/guild-mng-bot

# イメージビルド
docker compose build

# コンテナ起動
docker compose up -d

# 起動待機
sleep 10

# ステータス確認
docker compose ps
```

**期待される出力**:
```
NAME                COMMAND                  SERVICE   STATUS
guild-mng-bot-1     "docker-entrypoint.s…"   app       Up X seconds
```

### 6.2 ログ確認

```bash
# 最新50行のログを表示
docker compose logs --tail=50

# リアルタイムログ監視（Ctrl+Cで終了）
docker compose logs -f
```

**確認ポイント**:
- ✅ `Bot is ready!` のメッセージが表示される
- ✅ エラーメッセージがない
- ✅ Discord上でBotがオンラインになっている

### 6.3 トラブルシューティング

エラーが発生した場合:

```bash
# 詳細ログ確認
docker compose logs --tail=100

# コンテナ再起動
docker compose restart

# 完全再デプロイ
docker compose down
docker compose up -d --build
```

---

## Step 7: GitHub Actions デプロイワークフロー実行テスト

### 7.1 変更をコミット&プッシュ（ローカル）

```bash
# ローカルマシンで実行
cd /home/shun/dev/guild-mng-bot

# ブランチ確認
git branch

# mainブランチに切り替え（またはマージ）
git checkout main

# テスト用の小さな変更
echo "# Deployment test" >> README.md
git add README.md
git commit -m "test: Verify GitHub Actions deployment"
git push origin main
```

### 7.2 GitHub Actionsログ確認

1. GitHubリポジトリページ → **Actions**タブ
2. 最新の"Deploy to Oracle Cloud"ワークフローを選択
3. 各ステップが✅になることを確認

### 7.3 デプロイ成功確認

```bash
# Oracle Instanceで確認
cd ~/guild-mng-bot

# 最新コードが取得されているか確認
git log -1

# コンテナが正常に動作しているか確認
docker compose ps
docker compose logs --tail=20
```

---

## ✅ 完了チェックリスト

- [ ] Public IPアドレス取得完了
- [ ] GitHub Secrets 5つ全て設定完了
- [ ] Security List設定完了（SSH, HTTP, HTTPS）
- [ ] iptables設定完了
- [ ] SSH接続テスト成功
- [ ] Docker環境構築完了
- [ ] リポジトリクローン完了
- [ ] .env設定完了
- [ ] データベース転送完了
- [ ] 初回デプロイ成功（Botがオンライン）
- [ ] GitHub Actions自動デプロイテスト成功

---

## 🎉 次のステップ

デプロイ完了後は、[REFACTORING_PLAN.md](../REFACTORING_PLAN.md) の **Phase 2: データ永続化強化** に進みます。

---

## 📚 関連ドキュメント

- [Oracle Cloud詳細設定](ORACLE_CLOUD_SETUP.md)
- [GitHub Secrets設定](../GITHUB_SECRETS_SETUP.md)
- [リファクタリング計画](../REFACTORING_PLAN.md)
