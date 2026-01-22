# 複数Bot運用ガイド

## 概要

複数のDiscord Botを効率的に運用するためのベストプラクティスとアーキテクチャパターンを説明します。

## なぜ複数Botか？

### ユースケース

1. **機能分離**: 管理Bot、音楽Bot、ゲームBotを分ける
2. **サーバー分離**: 異なるDiscordサーバー用に別Bot
3. **負荷分散**: 高負荷時に複数Botで分散
4. **テスト環境**: 本番Botとテスト用Botを分離
5. **A/Bテスト**: 新機能を一部のサーバーでテスト

---

## アーキテクチャパターン

### パターン1: 独立型（最もシンプル）

```
Bot1（独立）  Bot2（独立）  Bot3（独立）
   ↓             ↓             ↓
SQLite1      SQLite2       SQLite3
```

**メリット**:
- シンプル
- 完全独立（障害の影響なし）
- デプロイ簡単

**デメリット**:
- データ共有不可
- リソース効率悪い
- 管理が煩雑

**適用例**: 完全に異なる機能のBot（管理、音楽、ゲーム）

---

### パターン2: 共有DB型（推奨）

```
Bot1    Bot2    Bot3
  ↓      ↓      ↓
  PostgreSQL（共有）
```

**メリット**:
- データ共有可能
- 統計・分析しやすい
- 一元管理

**デメリット**:
- DB障害で全Bot影響
- 競合制御が必要

**適用例**: 同じ機能で異なるサーバー用のBot

---

### パターン3: マイクロサービス型（上級）

```
           API Gateway
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
  Bot1      Bot2      Bot3
    ↓         ↓         ↓
    └─────────┼─────────┘
              ↓
         PostgreSQL
              ↓
        Redis（キャッシュ）
```

**メリット**:
- 高スケーラビリティ
- 柔軟な負荷分散
- モニタリング容易

**デメリット**:
- 複雑
- オーバーヘッド大

**適用例**: 大規模運用（数万サーバー）

---

## Docker Compose構成例

### 独立型

```yaml
# docker-compose.yml
version: '3.8'

services:
  bot1:
    build: .
    container_name: guild-bot-1
    environment:
      DISCORD_TOKEN: ${BOT1_TOKEN}
      DISCORD_APP_ID: ${BOT1_APP_ID}
      SQLITE_PATH: /app/storage/bot1.sqlite
    volumes:
      - bot1_data:/app/storage
    restart: unless-stopped

  bot2:
    build: .
    container_name: guild-bot-2
    environment:
      DISCORD_TOKEN: ${BOT2_TOKEN}
      DISCORD_APP_ID: ${BOT2_APP_ID}
      SQLITE_PATH: /app/storage/bot2.sqlite
    volumes:
      - bot2_data:/app/storage
    restart: unless-stopped

  bot3:
    build: .
    container_name: guild-bot-3
    environment:
      DISCORD_TOKEN: ${BOT3_TOKEN}
      DISCORD_APP_ID: ${BOT3_APP_ID}
      SQLITE_PATH: /app/storage/bot3.sqlite
    volumes:
      - bot3_data:/app/storage
    restart: unless-stopped

volumes:
  bot1_data:
  bot2_data:
  bot3_data:
```

### 共有DB型（推奨）

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL（共有DB）
  postgres:
    image: postgres:16-alpine
    container_name: guild-bot-db
    environment:
      POSTGRES_USER: ${DB_USER:-guild_bot}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: guild_bot
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-guild_bot}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Bot 1
  bot1:
    build: .
    container_name: guild-bot-1
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DISCORD_TOKEN: ${BOT1_TOKEN}
      DISCORD_APP_ID: ${BOT1_APP_ID}
      DATABASE_URL: postgresql://${DB_USER:-guild_bot}:${DB_PASSWORD}@postgres:5432/guild_bot
      BOT_NAME: bot1
      PORT: 3001
    volumes:
      - bot1_logs:/app/storage/logs
    restart: unless-stopped

  # Bot 2
  bot2:
    build: .
    container_name: guild-bot-2
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DISCORD_TOKEN: ${BOT2_TOKEN}
      DISCORD_APP_ID: ${BOT2_APP_ID}
      DATABASE_URL: postgresql://${DB_USER:-guild_bot}:${DB_PASSWORD}@postgres:5432/guild_bot
      BOT_NAME: bot2
      PORT: 3002
    volumes:
      - bot2_logs:/app/storage/logs
    restart: unless-stopped

  # Bot 3
  bot3:
    build: .
    container_name: guild-bot-3
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DISCORD_TOKEN: ${BOT3_TOKEN}
      DISCORD_APP_ID: ${BOT3_APP_ID}
      DATABASE_URL: postgresql://${DB_USER:-guild_bot}:${DB_PASSWORD}@postgres:5432/guild_bot
      BOT_NAME: bot3
      PORT: 3003
    volumes:
      - bot3_logs:/app/storage/logs
    restart: unless-stopped

  # Nginx（リバースプロキシ）
  nginx:
    image: nginx:alpine
    container_name: guild-bot-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - bot1
      - bot2
      - bot3
    restart: unless-stopped

volumes:
  postgres_data:
  bot1_logs:
  bot2_logs:
  bot3_logs:
```

### Nginx設定例

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream bot_backends {
        server bot1:3001;
        server bot2:3002;
        server bot3:3003;
    }

    server {
        listen 80;
        server_name guild-bot.example.com;

        location / {
            proxy_pass http://bot_backends;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /bot1/ {
            proxy_pass http://bot1:3001/;
        }

        location /bot2/ {
            proxy_pass http://bot2:3002/;
        }

        location /bot3/ {
            proxy_pass http://bot3:3003/;
        }

        location /health {
            access_log off;
            return 200 "OK";
        }
    }
}
```

---

## Kubernetes構成（K3s）

### デプロイメント例

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: guild-bots
```

```yaml
# k8s/postgres.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: guild-bots
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: guild-bots
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: guild-bots
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

```yaml
# k8s/bot-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: guild-bot
  namespace: guild-bots
spec:
  replicas: 3  # 3つのBotインスタンス
  selector:
    matchLabels:
      app: guild-bot
  template:
    metadata:
      labels:
        app: guild-bot
    spec:
      containers:
      - name: bot
        image: ghcr.io/sonozakisz/guild-mng-bot:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        - name: DISCORD_TOKEN
          valueFrom:
            secretKeyRef:
              name: discord-secret
              key: token
        - name: DISCORD_APP_ID
          valueFrom:
            secretKeyRef:
              name: discord-secret
              key: app-id
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## 環境変数管理

### .envファイル例

```bash
# .env

# Bot 1
BOT1_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.GhIjKlMnOpQrStUvWxYz
BOT1_APP_ID=1234567890123456789

# Bot 2
BOT2_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.ZyXwVu.TsRqPoNmLkJiHgFeDcBa
BOT2_APP_ID=9876543210987654321

# Bot 3
BOT3_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.BaCdEf.GhIjKlMnOpQrStUvWxYz
BOT3_APP_ID=1357924680135792468

# Database
DB_USER=guild_bot
DB_PASSWORD=your-secure-password
DATABASE_URL=postgresql://guild_bot:your-secure-password@postgres:5432/guild_bot
```

### Secretsマネージャー（推奨）

```bash
# Docker Secrets
echo "your-bot-token" | docker secret create bot1_token -
docker service update --secret-add bot1_token guild-bot-1

# Kubernetes Secrets
kubectl create secret generic discord-secret \
  --from-literal=token=MTIzNDU2... \
  --from-literal=app-id=1234567890 \
  -n guild-bots
```

---

## モニタリング

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'guild-bots'
    static_configs:
      - targets: 
        - 'bot1:3001'
        - 'bot2:3002'
        - 'bot3:3003'
```

---

## 負荷分散戦略

### Bot数の決定

**計算式**:
```
必要Bot数 = (総ギルド数 / 2500) + 1
```

Discord APIレート制限:
- 50リクエスト/秒
- 2500ギルド/Bot推奨

**例**:
- 1,000ギルド → 1 Bot
- 5,000ギルド → 2〜3 Bot
- 10,000ギルド → 4〜5 Bot

### シャーディング（大規模向け）

```typescript
// src/bot/index.ts
import { ShardingManager } from 'discord.js';

const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto', // 自動計算
});

manager.on('shardCreate', shard => {
  console.log(`Launched shard ${shard.id}`);
});

manager.spawn();
```

---

## デプロイ戦略

### ブルーグリーンデプロイ

```bash
# 現在: bot1, bot2, bot3（本番）

# 新バージョンをbot4, bot5, bot6でデプロイ
docker compose -f docker-compose.new.yml up -d

# テスト
curl http://localhost:3004/health

# 切り替え（Nginxでupstream変更）
# 旧バージョン停止
docker compose -f docker-compose.old.yml down
```

### カナリアリリース

```yaml
# 90%のトラフィックを既存Bot、10%を新Bot
upstream bot_backends {
    server bot1:3001 weight=3;
    server bot2:3002 weight=3;
    server bot3:3003 weight=3;
    server bot4:3004 weight=1;  # 新バージョン
}
```

---

## トラブルシューティング

### DB接続エラー

```bash
# PostgreSQL接続確認
docker exec -it guild-bot-db psql -U guild_bot

# 接続数確認
SELECT count(*) FROM pg_stat_activity;
```

### メモリリーク

```bash
# メモリ使用量監視
docker stats

# ヒープダンプ取得
docker exec bot1 node --expose-gc --heap-prof ./path/to/app.js
```

### Bot間の競合

```sql
-- トランザクション使用
BEGIN;
UPDATE guild_configs SET ... WHERE guild_id = '...' AND updated_at = '...';
COMMIT;
```

---

## ベストプラクティス

### 1. Bot識別子を追加

```typescript
// src/shared/config/index.ts
export const config = {
  botName: process.env.BOT_NAME || 'bot1',
  // ...
};

// ログに含める
logger.info(`[${config.botName}] Bot started`);
```

### 2. リソース制限

```yaml
# docker-compose.yml
services:
  bot1:
    # ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M
```

### 3. ヘルスチェック

```typescript
// src/server/routes/api/health.ts
export default async (fastify) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      bot: config.botName,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      guilds: client.guilds.cache.size,
    };
  });
};
```

---

## コスト最適化

### リソース配分

| Bot数 | RAM | CPU | 推奨プラットフォーム | コスト/月 |
|-------|-----|-----|---------------------|----------|
| 1 | 512MB | 0.5 | Fly.io | $0 |
| 2-3 | 1GB | 1.0 | Oracle Cloud | $0 |
| 4-5 | 2GB | 2.0 | 自宅サーバー | ~$5 |
| 6+ | 4GB+ | 4.0+ | VPS or クラウド | $20+ |

---

## まとめ

**複数Bot運用のポイント**:
- 小規模（1-2Bot）: 独立型
- 中規模（3-5Bot）: 共有DB型
- 大規模（6+Bot）: マイクロサービス型

**推奨構成**:
- 開発環境: Docker Compose
- 本番環境: Kubernetes（K3s）
- モニタリング: Prometheus + Grafana

現在のアーキテクチャは複数Bot対応を考慮しているため、**いつでもスケール可能**です！
