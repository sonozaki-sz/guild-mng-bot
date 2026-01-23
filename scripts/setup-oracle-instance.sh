#!/bin/bash
# Oracle Cloud Instance 初期セットアップスクリプト
# 使用方法: ssh経由で実行するか、インスタンスに転送して実行

set -e  # エラー時に停止

echo "========================================"
echo " Oracle Cloud Instance Setup for"
echo " guild-mng-bot"
echo "========================================"
echo ""

# カラー定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ステップ1: システム更新
echo -e "${YELLOW}[1/6] システム更新中...${NC}"
sudo apt update
sudo apt upgrade -y
echo -e "${GREEN}✓ システム更新完了${NC}"
echo ""

# ステップ2: Docker インストール
echo -e "${YELLOW}[2/6] Docker インストール中...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker インストール完了${NC}"
else
    echo -e "${GREEN}✓ Docker は既にインストール済み${NC}"
fi
echo ""

# ステップ3: ユーザーをdockerグループに追加
echo -e "${YELLOW}[3/6] Docker グループ設定中...${NC}"
sudo usermod -aG docker $USER
echo -e "${GREEN}✓ ユーザー '$USER' を docker グループに追加${NC}"
echo -e "${YELLOW}  注意: 変更を適用するには再ログインが必要です${NC}"
echo ""

# ステップ4: Docker Compose インストール
echo -e "${YELLOW}[4/6] Docker Compose インストール中...${NC}"
sudo apt install docker-compose-plugin -y
echo -e "${GREEN}✓ Docker Compose インストール完了${NC}"
echo ""

# ステップ5: Git インストール
echo -e "${YELLOW}[5/6] Git インストール中...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt install git -y
    echo -e "${GREEN}✓ Git インストール完了${NC}"
else
    echo -e "${GREEN}✓ Git は既にインストール済み${NC}"
fi
echo ""

# ステップ6: ファイアウォール設定
echo -e "${YELLOW}[6/6] ファイアウォール設定中...${NC}"
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# netfilter-persistentのインストールと保存
if ! command -v netfilter-persistent &> /dev/null; then
    echo "iptables-persistent をインストールします..."
    echo iptables-persistent iptables-persistent/autosave_v4 boolean true | sudo debconf-set-selections
    echo iptables-persistent iptables-persistent/autosave_v6 boolean true | sudo debconf-set-selections
    sudo apt install iptables-persistent -y
fi
sudo netfilter-persistent save
echo -e "${GREEN}✓ ファイアウォール設定完了 (Port 80, 443 開放)${NC}"
echo ""

# バージョン確認
echo "========================================"
echo " インストール確認"
echo "========================================"
echo -e "${GREEN}Docker:${NC}"
docker --version
echo -e "${GREEN}Docker Compose:${NC}"
docker compose version
echo -e "${GREEN}Git:${NC}"
git --version
echo ""

echo "========================================"
echo -e "${GREEN} ✓ セットアップ完了！${NC}"
echo "========================================"
echo ""
echo "次のステップ:"
echo "  1. 一度ログアウトして再ログイン（Dockerグループ変更適用）"
echo "     $ exit"
echo "     $ ssh ubuntu@<HOST>"
echo ""
echo "  2. リポジトリをクローン"
echo "     $ git clone https://github.com/sonozakiSZ/guild-mng-bot.git"
echo "     $ cd guild-mng-bot"
echo ""
echo "  3. .envファイルを作成"
echo "     $ cp .env.example .env"
echo "     $ nano .env"
echo ""
echo "  4. データベースをSCPで転送（ローカルから実行）"
echo "     $ scp storage/db.sqlite ubuntu@<HOST>:~/guild-mng-bot/storage/"
echo ""
echo "  5. Docker Composeで起動"
echo "     $ docker compose up -d"
echo ""
