#!/bin/bash
# ローカルマシンから実行するデプロイスクリプト
# Oracle Cloud Instanceへの初回デプロイを自動化

set -e

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 設定（必要に応じて変更）
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
ORACLE_HOST="${ORACLE_HOST:-}"
ORACLE_USER="${ORACLE_USER:-ubuntu}"
REPO_URL="https://github.com/sonozakiSZ/guild-mng-bot.git"

echo "========================================"
echo " guild-mng-bot 初回デプロイスクリプト"
echo "========================================"
echo ""

# Oracle Hostのチェック
if [ -z "$ORACLE_HOST" ]; then
    echo -e "${YELLOW}ORACLE_HOST環境変数が設定されていません${NC}"
    read -p "Oracle Cloud InstanceのPublic IPを入力してください: " ORACLE_HOST
fi

echo -e "${GREEN}接続先: ${ORACLE_USER}@${ORACLE_HOST}${NC}"
echo ""

# SSH接続テスト
echo -e "${YELLOW}[1/6] SSH接続テスト中...${NC}"
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "${ORACLE_USER}@${ORACLE_HOST}" "echo 'SSH接続成功'" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ SSH接続成功${NC}"
else
    echo -e "${RED}✗ SSH接続失敗${NC}"
    echo "SSH鍵のパスとホスト名を確認してください"
    exit 1
fi
echo ""

# セットアップスクリプトの転送と実行
echo -e "${YELLOW}[2/6] セットアップスクリプト転送中...${NC}"
scp -i "$SSH_KEY" scripts/setup-oracle-instance.sh "${ORACLE_USER}@${ORACLE_HOST}:~/"
echo -e "${GREEN}✓ スクリプト転送完了${NC}"
echo ""

echo -e "${YELLOW}[3/6] サーバー環境セットアップ実行中...${NC}"
echo -e "${YELLOW}  (Docker, Git, ファイアウォール設定)${NC}"
ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_HOST}" "bash ~/setup-oracle-instance.sh"
echo -e "${GREEN}✓ サーバー環境構築完了${NC}"
echo ""

# リポジトリクローン
echo -e "${YELLOW}[4/6] リポジトリクローン中...${NC}"
ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_HOST}" << EOF
    if [ -d ~/guild-mng-bot ]; then
        echo "既にリポジトリが存在します。スキップします。"
    else
        git clone ${REPO_URL}
        echo "リポジトリクローン完了"
    fi
    
    # ディレクトリ作成
    mkdir -p ~/guild-mng-bot/storage
    mkdir -p ~/guild-mng-bot/logs
EOF
echo -e "${GREEN}✓ リポジトリ準備完了${NC}"
echo ""

# .envファイルの確認
echo -e "${YELLOW}[5/6] .envファイル確認中...${NC}"
ssh -i "$SSH_KEY" "${ORACLE_USER}@${ORACLE_HOST}" << 'EOF'
    cd ~/guild-mng-bot
    if [ ! -f .env ]; then
        cp .env.example .env
        echo ".env.example から .envファイルを作成しました"
        echo ""
        echo "=========================================="
        echo " 重要: .envファイルを編集してください"
        echo "=========================================="
        echo "以下のコマンドで編集できます:"
        echo "  nano ~/guild-mng-bot/.env"
        echo ""
        echo "必要な設定:"
        echo "  TOKEN=\"YOUR_DISCORD_TOKEN\""
        echo "  APP_ID=\"YOUR_DISCORD_APP_ID\""
        echo "  LOCALE=\"ja\""
        echo "  DATABASE_URL=\"sqlite://storage/db.sqlite\""
    else
        echo ".envファイルは既に存在します"
    fi
EOF
echo ""

# データベース転送
echo -e "${YELLOW}[6/6] データベースファイル転送中...${NC}"
if [ -f "storage/db.sqlite" ]; then
    scp -i "$SSH_KEY" storage/db.sqlite "${ORACLE_USER}@${ORACLE_HOST}:~/guild-mng-bot/storage/"
    echo -e "${GREEN}✓ データベース転送完了${NC}"
else
    echo -e "${YELLOW}  警告: storage/db.sqlite が見つかりません${NC}"
    echo -e "${YELLOW}  新規データベースとして起動します${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN} ✓ 初回デプロイ準備完了！${NC}"
echo "========================================"
echo ""
echo "次のステップ:"
echo ""
echo "1. サーバーにSSH接続"
echo "   $ ssh -i $SSH_KEY ${ORACLE_USER}@${ORACLE_HOST}"
echo ""
echo "2. .envファイルを編集（必須）"
echo "   $ nano ~/guild-mng-bot/.env"
echo ""
echo "3. Botを起動"
echo "   $ cd ~/guild-mng-bot"
echo "   $ docker compose up -d"
echo ""
echo "4. ログ確認"
echo "   $ docker compose logs -f"
echo ""
echo "=========================================="
echo ""
