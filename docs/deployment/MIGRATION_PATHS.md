# プラットフォーム移行パス

## 概要

Oracle Cloud Always Freeから他のプラットフォームへの移行、または複数プラットフォームの併用について説明します。

## 移行シナリオ

### シナリオ1: Oracle Cloud → 自宅サーバー（学習 + フルコントロール）
**対象**: Kubernetes学習、完全なコントロールが欲しい、電気代を許容できる

### シナリオ2: Oracle Cloud → 他VPS（Contabo, Hetzner等）
**対象**: Oracle Cloudのリージョン容量不足、より高性能なスペックが必要

### シナリオ3: ハイブリッド構成
**対象**: 本番Oracle Cloud、開発環境は自宅サーバー

---

## 現在のデプロイ先: Oracle Cloud Always Free

### なぜOracle Cloudか？

**メリット**:
- ✅ **永久無料**: ARM Ampere A1（4 OCPU / 24GB RAM）を無期限で使用可能
- ✅ **東京リージョン**: 低レイテンシ（日本国内）
- ✅ **複数Bot運用**: 同時に複数Botを稼働可能
- ✅ **Kubernetes構築可能**: 学習に最適
- ✅ **Block Volume 200GB**: ストレージも無料で十分な容量
- ✅ **10TB/月の帯域**: ネットワーク転送も無料枠が広い

**デメリット**:
- ❌ セットアップが複雑
- ⚠️ アイドル回収リスク（7日間 CPU/Network/Memory < 20%）→ Discord Bot（WebSocket常時接続）は該当しない
- ⚠️ リージョン容量不足の可能性（Tokyo満員の場合、Osaka等を使用）
- ⚠️ UIが使いにくい

---

## 移行パス1: Oracle Cloud → 自宅サーバー

### なぜ自宅サーバーか？

**メリット**:
- ✅ **完全無料**: 電気代のみ（月500円程度）
- ✅ **学習**: Docker、Kubernetes、ネットワークを学べる
- ✅ **フルコントロール**: 好きなようにカスタマイズ可能
- ✅ **複数Bot**: スペック次第で無限に運用可能
- ✅ **プライバシー**: データは自分の管理下

**デメリット**:
- ❌ 初期投資: ハードウェア購入（1〜5万円）
- ❌ 電気代: 月500円前後
- ❌ 管理負担: 自分でメンテナンス
- ❌ 停電・ネット障害リスク
- ❌ 固定IP必要（WebUI公開の場合）

### ハードウェア選択

#### オプション1: Raspberry Pi 4（推奨・初心者向け）

**スペック**:
- CPU: ARM Cortex-A72 (4コア)
- RAM: 4GB or 8GB
- ストレージ: microSD 64GB + 外付けSSD推奨

**コスト**:
- 本体: 約8,000円（8GBモデル）
- 電源: 約1,500円
- ケース: 約1,500円
- microSD: 約1,500円
- SSD（オプション）: 約5,000円
- **合計: 約12,000〜18,000円**

**消費電力**: 3〜7W（月150〜300円）

**メリット**: 省電力、静音、コンパクト、コミュニティ大きい

**デメリット**: ARMアーキテクチャ（一部Dockerイメージ非対応）、ストレージ速度

#### オプション2: 中古PC（パワーユーザー向け）

**推奨スペック**:
- CPU: Intel Core i3以上 or AMD Ryzen 3以上
- RAM: 8GB以上
- ストレージ: SSD 128GB以上

**コスト**: 15,000〜30,000円

**消費電力**: 30〜60W（月500〜1,000円）

**メリット**: x86アーキテクチャ（互換性◎）、高性能、拡張性高い

**デメリット**: 消費電力大、騒音、大きい

### 自宅サーバーセットアップ手順

#### 1. OS インストール

```bash
# Ubuntu Server 22.04 LTS（推奨）
# https://ubuntu.com/download/server
# USBメモリに書き込んでインストール
```

#### 2. SSH有効化 & 初期設定

```bash
# SSH有効化
sudo systemctl enable ssh
sudo systemctl start ssh

# システム更新
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y

# 固定IPアドレス設定（/etc/netplan/01-netcfg.yaml）
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4

sudo netplan apply
```

#### 3. Docker & Docker Composeインストール

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

sudo apt install docker-compose-plugin -y

docker --version
docker compose version
```

#### 4. Botデプロイ

```bash
cd ~
git clone https://github.com/sonozakiSZ/guild-mng-bot.git
cd guild-mng-bot

cp .env.example .env
nano .env  # トークン等を設定

docker compose up -d
docker compose logs -f
```

#### 5. 自動起動設定（Systemd）

```bash
sudo nano /etc/systemd/system/guild-mng-bot.service
```

```ini
[Unit]
Description=Guild Management Bot
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/guild-mng-bot
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart
Restart=on-failure
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable guild-mng-bot.service
sudo systemctl start guild-mng-bot.service
sudo systemctl status guild-mng-bot.service
```

### データ移行

```bash
# Oracle Cloudからデータバックアップ取得
scp -i ~/.ssh/oracle_cloud ubuntu@<ORACLE_IP>:~/guild-mng-bot/storage/db.sqlite ./

# 自宅サーバーにアップロード
scp db.sqlite ubuntu@192.168.1.100:~/guild-mng-bot/storage/

# または、直接rsync
rsync -avz -e "ssh -i ~/.ssh/oracle_cloud" \
  ubuntu@<ORACLE_IP>:~/guild-mng-bot/storage/ \
  ubuntu@192.168.1.100:~/guild-mng-bot/storage/
```

### WebUI公開（オプション）

#### パターンA: Cloudflare Tunnel（固定IP不要・推奨）

```bash
# cloudflaredインストール
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# 認証
cloudflared tunnel login

# トンネル作成
cloudflared tunnel create guild-bot

# 設定ファイル作成（~/.cloudflared/config.yml）
tunnel: <TUNNEL_ID>
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: guild-bot.example.com
    service: http://localhost:3000
  - service: http_status:404

# トンネル実行
cloudflared tunnel run guild-bot

# Systemdサービス化
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

#### パターンB: ダイナミックDNS + Nginx

```bash
# DuckDNS（https://www.duckdns.org/）でドメイン取得

# 更新スクリプト作成
mkdir ~/duckdns
cd ~/duckdns
nano duck.sh
```

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=guild-bot&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod +x duck.sh

# cron設定（5分ごとに更新）
crontab -e
# 追加: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1

# Nginxインストール
sudo apt install nginx -y

# 設定ファイル作成
sudo nano /etc/nginx/sites-available/guild-bot
```

```nginx
server {
    listen 80;
    server_name guild-bot.duckdns.org;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/guild-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL証明書（Let's Encrypt）
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d guild-bot.duckdns.org
```

### コスト試算

#### Raspberry Pi 4（8GB）

```
初期投資: 18,000円
消費電力: 5W × 24h × 30日 = 3.6kWh
電気代: 3.6kWh × 30円/kWh = 108円/月

年間コスト: 108円 × 12ヶ月 = 1,296円
3年間総コスト: 18,000円 + 3,888円 = 21,888円
```

#### 中古PC（Core i5）

```
初期投資: 25,000円
消費電力: 40W × 24h × 30日 = 28.8kWh
電気代: 28.8kWh × 30円/kWh = 864円/月

年間コスト: 864円 × 12ヶ月 = 10,368円
3年間総コスト: 25,000円 + 31,104円 = 56,104円
```

---

## 移行パス2: Oracle Cloud → 他VPS

### なぜ他VPSか？

**理由**:
- Oracle Cloudのリージョン容量不足（Tokyo/Osaka満員）
- より高性能なスペックが必要
- より簡単なUI/管理画面が欲しい

### 推奨VPSプロバイダー

#### オプション1: Contabo（コスパ最強）

**スペック**: CLOUD VPS M
- CPU: 6 vCPU
- RAM: 16GB
- ストレージ: 400GB NVMe
- 帯域: 32TB/月
- **価格: €7.99/月（約1,200円）**

**メリット**: 圧倒的コスパ、高スペック、ドイツ/アメリカリージョン

**デメリット**: 日本リージョンなし（レイテンシ高い）、サポートが英語のみ

#### オプション2: Hetzner（高性能・ヨーロッパ）

**スペック**: CPX21
- CPU: 3 vCPU
- RAM: 4GB
- ストレージ: 80GB NVMe
- 帯域: 20TB/月
- **価格: €5.83/月（約880円）**

**メリット**: 高性能、シンプルUI、評判良い

**デメリット**: 日本リージョンなし、クレジットカード認証必要

#### オプション3: Vultr（グローバル展開）

**スペック**: Regular Performance - 2GB RAM
- CPU: 1 vCPU
- RAM: 2GB
- ストレージ: 55GB SSD
- 帯域: 2TB/月
- **価格: $12/月（約1,800円）**
- **東京リージョンあり**

**メリット**: 東京リージョン、シンプル、評判良い

**デメリット**: Contabo/Hetznerより高価

### セットアップ手順（共通）

#### 1. VPSアカウント作成 & インスタンス起動

```bash
# 各プロバイダーのWebコンソールで実施
# - OS: Ubuntu 22.04
# - SSHキー登録
# - インスタンス起動
```

#### 2. SSH接続 & 初期設定

```bash
ssh root@<VPS_IP>

# システム更新
apt update && apt upgrade -y

# ユーザー作成（セキュリティ）
adduser ubuntu
usermod -aG sudo ubuntu
su - ubuntu
```

#### 3. Docker & Docker Composeインストール

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

sudo apt install docker-compose-plugin -y
```

#### 4. Botデプロイ

```bash
git clone https://github.com/sonozakiSZ/guild-mng-bot.git
cd guild-mng-bot

cp .env.example .env
nano .env

docker compose up -d
```

### データ移行

```bash
# Oracle Cloudからバックアップ取得
ssh -i ~/.ssh/oracle_cloud ubuntu@<ORACLE_IP>
cd ~/guild-mng-bot
tar -czf backup.tar.gz storage/
exit

# VPSにアップロード
scp -i ~/.ssh/oracle_cloud ubuntu@<ORACLE_IP>:~/guild-mng-bot/backup.tar.gz ./
scp backup.tar.gz ubuntu@<VPS_IP>:~/

# VPS側で展開
ssh ubuntu@<VPS_IP>
cd ~/guild-mng-bot
tar -xzf ~/backup.tar.gz
docker compose restart
```

### コスト比較（月額）

| プラットフォーム | スペック | 価格 | 日本リージョン |
|----------------|---------|------|--------------|
| **Oracle Cloud Always Free** | 1 OCPU / 6GB RAM | **$0** ✅ | ✅ Tokyo |
| **Contabo CLOUD VPS M** | 6 vCPU / 16GB RAM | €7.99 (~¥1,200) | ❌ |
| **Hetzner CPX21** | 3 vCPU / 4GB RAM | €5.83 (~¥880) | ❌ |
| **Vultr 2GB** | 1 vCPU / 2GB RAM | $12 (~¥1,800) | ✅ Tokyo |
| **自宅サーバー（Raspberry Pi）** | 4コア / 8GB RAM | 電気代のみ (~¥300) | ✅ |

---

## ハイブリッド構成

### パターン1: 本番Oracle Cloud + 開発自宅

```
本番環境（Oracle Cloud）
├─ 24/7稼働
├─ GitHub Actions自動デプロイ
└─ mainブランチ

開発環境（自宅サーバー）
├─ 実験的機能
├─ 手動デプロイ
└─ developブランチ
```

**メリット**:
- 本番環境の安定性（Oracle Cloud無料枠）
- 開発環境でのコスト削減（既存ハードウェア活用）
- 自宅でKubernetes学習

### パターン2: 複数Bot運用（同一インスタンス）

```
Oracle Cloud Compute Instance（1 OCPU / 6GB RAM）
├─ Bot1（docker-compose service）
├─ Bot2（docker-compose service）
├─ Bot3（docker-compose service）
└─ PostgreSQL（共有DB - オプション）
```

**メリット**:
- 1つのインスタンスで複数Bot稼働
- 無料枠内で完結
- 管理が集約される

---

## 移行チェックリスト

### 事前準備
- [ ] データバックアップ完了
- [ ] 環境変数リスト作成
- [ ] DNS設定確認（WebUI用）
- [ ] テスト環境で動作確認

### 移行実行
- [ ] 新環境でBot起動
- [ ] データ移行完了
- [ ] 動作確認（全コマンド）
- [ ] ログ確認

### 移行後
- [ ] 旧環境停止
- [ ] モニタリング設定
- [ ] ドキュメント更新
- [ ] チーム通知

---

## トラブルシューティング

### SSH接続エラー

```bash
# ファイアウォール確認
sudo ufw status

# ポート22開放
sudo ufw allow 22/tcp
sudo ufw enable
```

### データ移行失敗

```bash
# バックアップが空でないか確認
tar -tzf backup.tar.gz

# 権限エラー
sudo chown -R $USER:$USER ~/guild-mng-bot/storage
```

### 複数Bot起動失敗

```bash
# ポート競合
# → docker-compose.ymlでポート分離

# メモリ不足
docker stats

# リソース制限（docker-compose.yml）
services:
  bot1:
    deploy:
      resources:
        limits:
          memory: 512M
```

---

## まとめ

**短期（現在〜6ヶ月）**: Oracle Cloud Always Free継続

**中期（6ヶ月〜1年）**: 
- 複数Bot運用開始
- WebUI実装検討
- 自宅サーバー構築（学習目的、開発環境）

**長期（1年〜）**: 
- ハイブリッド構成（本番Oracle + 開発自宅）
- または他VPS検討（Contabo, Hetzner等）

現在のアーキテクチャは**プラットフォーム非依存**（Docker Compose）なので、いつでも移行可能です。
