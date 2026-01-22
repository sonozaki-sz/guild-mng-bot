# リファクタリング実行計画

## 目的

現在のguild-mng-botを、以下を実現するアーキテクチャへリファクタリングする：

1. ✅ Fly.ioへの自動デプロイ
2. ✅ WebUIでのBot設定管理（将来実装）
3. ✅ メンテナンス性の向上
4. ✅ Kubernetes移行の準備（将来）

## 現状の問題点

### 1. データ永続化の問題
- **現在**: SQLiteファイル（`storage/db.sqlite`）
- **問題**: Fly.ioではコンテナ再起動時にリセット
- **対策**: PostgreSQL（Fly Postgres）への移行

### 2. 設定管理の分散
- **現在**: 環境変数 + Keyv個別メソッド
- **問題**: WebUIから一元管理できない
- **対策**: リポジトリパターン + 型定義の整備

### 3. アーキテクチャの問題
- **現在**: Botのみの単一構成
- **問題**: Webサーバー機能がない
- **対策**: Bot + Server の統合アーキテクチャ

### 4. デプロイ設定の不足
- **現在**: Docker Composeとk8s manifest
- **問題**: Fly.io用設定がない
- **対策**: fly.toml + GitHub Actions

### 5. ログ管理の問題
- **現在**: ローカルファイル出力
- **問題**: Fly.ioで閲覧困難
- **対策**: 標準出力ベースのログ

## リファクタリング全体計画

### Phase 1: 基盤構築 【重要度: 高】
**目標**: 新しいディレクトリ構造とShared Layer実装

**タスク**:
1. ✅ ブランチ作成（`refactor/webui-ready`）
2. □ 設計ドキュメント作成
3. □ ディレクトリ構造作成
4. □ Shared Layer実装
   - 型定義（types/）
   - 設定管理（config/）
   - ユーティリティ（utils/）
   - データアクセス基盤（database/）

**成果物**:
- `src/shared/` 配下の基盤コード
- 型定義ファイル
- 設定スキーマ

**検証基準**:
- TypeScriptコンパイルが通る
- 型推論が正しく機能する

---

### Phase 2: Bot層の移行 【重要度: 高】
**目標**: 既存Botコードを新構造に移行

**タスク**:
1. □ `src/bot/` へのファイル移動
   - commands/ → src/bot/commands/
   - events/ → src/bot/events/
   - services/ → src/bot/services/
2. □ import パスの修正
3. □ Shared Layer への依存切り替え
4. □ Keyv → Repository への移行
5. □ ロガーの統一

**成果物**:
- リファクタリングされたBot層
- Repositoryパターン実装

**検証基準**:
- 全コマンドが動作する
- 既存機能が維持されている
- データベースへの保存が正常

---

### Phase 3: Server層の実装 【重要度: 中】
**目標**: 最小限のWebサーバー機能

**タスク**:
1. □ Fastify セットアップ
2. □ ヘルスチェックエンドポイント実装
   - `GET /health` → `{ status: "ok" }`
3. □ エラーハンドリングミドルウェア
4. □ ロギングミドルウェア
5. □ CORS設定

**成果物**:
- `src/server/index.ts`
- `/health` エンドポイント

**検証基準**:
- `curl http://localhost:3000/health` が成功
- サーバーが安定稼働

---

### Phase 4: 統合 【重要度: 高】
**目標**: Bot + Server の同時起動

**タスク**:
1. □ `src/index.ts` 実装
2. □ 起動シーケンスの実装
   - DB接続確認
   - Bot起動
   - Server起動
3. □ グレースフルシャットダウン
4. □ package.json スクリプト更新

**成果物**:
- 統合エントリーポイント
- 起動スクリプト

**検証基準**:
- `pnpm start` で両方起動
- Ctrl+C で正常終了

---

### Phase 5: データベース移行 【重要度: 高】
**目標**: SQLite → PostgreSQL

**タスク**:
1. □ Prisma セットアップ
2. □ スキーマ定義（`schema.prisma`）
3. □ マイグレーション作成
4. □ Repository実装のPrisma対応
5. □ データ移行スクリプト（SQLite → PostgreSQL）

**成果物**:
- `prisma/schema.prisma`
- マイグレーションファイル
- データ移行スクリプト

**検証基準**:
- 既存データが正しく移行される
- CRUD操作が正常動作

---

### Phase 6: Fly.io対応 【重要度: 高】
**目標**: Fly.ioでのデプロイ準備

**タスク**:
1. □ `fly.toml` 作成
2. □ Fly Postgres セットアップ
3. □ Dockerfile 最適化
4. □ 環境変数設定（Fly Secrets）
5. □ ヘルスチェック設定
6. □ ローカルでのテストデプロイ

**成果物**:
- `fly.toml`
- 最適化されたDockerfile

**検証基準**:
- `fly deploy` が成功
- Botが正常稼働
- ヘルスチェックが通る

---

### Phase 7: CI/CD構築 【重要度: 中】
**目標**: 自動デプロイパイプライン

**タスク**:
1. □ GitHub Actions ワークフロー作成
2. □ ビルドステップ
3. □ テストステップ（将来用）
4. □ デプロイステップ
5. □ Secrets設定

**成果物**:
- `.github/workflows/deploy.yml`

**検証基準**:
- mainブランチへのpushで自動デプロイ
- デプロイ成功通知

---

### Phase 8: WebUI準備 【重要度: 低（将来用）】
**目標**: WebUI実装の準備

**タスク**:
1. □ REST API設計
2. □ 認証機構（Discord OAuth2）
3. □ API エンドポイント実装
   - `GET /api/guilds` - ギルド一覧
   - `GET /api/guilds/:id/config` - 設定取得
   - `PUT /api/guilds/:id/config` - 設定更新
4. □ フロントエンド雛形（Vite + React）

**成果物**:
- API仕様書
- APIエンドポイント
- WebUI雛形

**検証基準**:
- API経由で設定取得・更新可能
- 認証が機能する

---

## 詳細実装手順

### Step 1: ディレクトリ構造作成

```bash
# 新ディレクトリ作成
mkdir -p src/{bot,server,shared}/{commands,events,services}
mkdir -p src/shared/{config,database,types,utils,locale}
mkdir -p src/shared/database/{repositories,models}
mkdir -p src/server/{routes,middleware}
mkdir -p src/server/routes/api
mkdir -p prisma/{migrations}
mkdir -p scripts
mkdir -p docs

# プレースホルダー作成
touch src/bot/index.ts
touch src/server/index.ts
touch src/shared/types/index.ts
```

**コミット**: `chore: create new directory structure`

---

### Step 2: 型定義の実装

**ファイル**: `src/shared/types/config.ts`

```typescript
export interface GuildConfig {
  guildId: string;
  afkVoiceChannelId?: string;
  profChannelId?: string;
  vacTriggerVcIds: string[];
  vacChannelIds: string[];
  bumpReminder: BumpReminderConfig;
  stickMessages: StickMessage[];
  leaveMemberLog: LeaveMemberLogConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface BumpReminderConfig {
  enabled: boolean;
  mentionRoleId?: string;
  remindDate?: number;
  mentionUserIds: string[];
}

export interface StickMessage {
  channelId: string;
  messageId: string;
}

export interface LeaveMemberLogConfig {
  channelId?: string;
}
```

**コミット**: `feat(shared): add type definitions`

---

### Step 3: 設定管理の実装

**ファイル**: `src/shared/config/index.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string(),
  DISCORD_APP_ID: z.string(),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOCALE: z.string().default('ja'),
});

export type Env = z.infer<typeof envSchema>;

export const config = envSchema.parse(process.env);
```

**コミット**: `feat(shared): add config management with validation`

---

### Step 4: ロガーの実装

**ファイル**: `src/shared/utils/logger.ts`

```typescript
import winston from 'winston';
import { config } from '../config';

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});
```

**コミット**: `feat(shared): add winston logger`

---

### Step 5: Repository基盤の実装

**ファイル**: `src/shared/database/client.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e) => logger.warn(e));
prisma.$on('error', (e) => logger.error(e));

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
```

**コミット**: `feat(shared): add database client with Prisma`

---

### Step 6: GuildConfig Repository実装

**ファイル**: `src/shared/database/repositories/guild-config.repository.ts`

```typescript
import { prisma } from '../client';
import { GuildConfig } from '../../types/config';

export class GuildConfigRepository {
  async findByGuildId(guildId: string): Promise<GuildConfig | null> {
    const data = await prisma.guildConfig.findUnique({
      where: { guildId },
    });
    
    if (!data) return null;
    
    return this.mapToModel(data);
  }
  
  async upsert(config: Partial<GuildConfig> & { guildId: string }): Promise<GuildConfig> {
    const data = await prisma.guildConfig.upsert({
      where: { guildId: config.guildId },
      create: this.mapToDb(config),
      update: this.mapToDb(config),
    });
    
    return this.mapToModel(data);
  }
  
  async deleteByGuildId(guildId: string): Promise<void> {
    await prisma.guildConfig.delete({
      where: { guildId },
    });
  }
  
  private mapToModel(data: any): GuildConfig {
    // DB → Model 変換
    return {
      guildId: data.guildId,
      afkVoiceChannelId: data.afkVoiceChannelId,
      // ... 他のフィールド
    };
  }
  
  private mapToDb(config: Partial<GuildConfig>): any {
    // Model → DB 変換
    return {
      // ...
    };
  }
}

export const guildConfigRepository = new GuildConfigRepository();
```

**コミット**: `feat(shared): add GuildConfig repository`

---

### Step 7: Bot層の移行

既存ファイルを新しい構造に移動し、importを修正

```bash
# commands移動
git mv src/commands/* src/bot/commands/

# events移動
git mv src/events/* src/bot/events/

# services移動（Bot固有のみ）
git mv src/services/discord.ts src/bot/services/
git mv src/services/discordBot.ts src/bot/services/
```

**各ファイル内のimport修正例**:

```typescript
// Before
import { logger } from './services/logger';

// After
import { logger } from '../../shared/utils/logger';
```

**コミット**: `refactor(bot): migrate to new structure`

---

### Step 8: Serverの実装

**ファイル**: `src/server/index.ts`

```typescript
import Fastify from 'fastify';
import { config } from '../shared/config';
import { logger } from '../shared/utils/logger';
import healthRoute from './routes/api/health';
import errorHandler from './middleware/error';

export async function startServer() {
  const fastify = Fastify({
    logger: false, // Winston使用
  });
  
  // ミドルウェア
  fastify.setErrorHandler(errorHandler);
  
  // ルート登録
  fastify.register(healthRoute, { prefix: '/api' });
  
  // 起動
  try {
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info(`Server listening on port ${config.PORT}`);
    return fastify;
  } catch (err) {
    logger.error('Server startup failed', err);
    throw err;
  }
}
```

**ファイル**: `src/server/routes/api/health.ts`

```typescript
import { FastifyPluginAsync } from 'fastify';

const healthRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  });
};

export default healthRoute;
```

**コミット**: `feat(server): add basic server with health check`

---

### Step 9: 統合エントリーポイント

**ファイル**: `src/index.ts`

```typescript
import { connectDatabase, disconnectDatabase } from './shared/database/client';
import { logger } from './shared/utils/logger';
import { startBot } from './bot';
import { startServer } from './server';

async function main() {
  try {
    // DB接続
    await connectDatabase();
    
    // Bot起動
    await startBot();
    
    // Server起動
    await startServer();
    
    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Application startup failed', error);
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

main();
```

**コミット**: `feat: add integrated entry point`

---

## ロールバック計画

各Phaseごとにブランチを保持し、問題発生時にロールバック可能にする。

```bash
# Phase完了時
git tag phase-1-complete
git push origin phase-1-complete
```

## リスク管理

| リスク | 影響 | 対策 |
|--------|------|------|
| データ移行失敗 | 高 | バックアップ + 段階的移行 |
| Bot機能の破損 | 高 | 各Phase後の動作確認 |
| Fly.io制約 | 中 | 事前検証環境構築 |
| 開発期間超過 | 低 | Phase単位で区切り |

## 検証チェックリスト

各Phaseで以下を確認：

- [ ] TypeScriptコンパイル成功
- [ ] 既存機能が動作
- [ ] ログが正常出力
- [ ] メモリリークなし
- [ ] エラーハンドリング適切

## 次のアクション

1. ✅ Phase 1を開始（ディレクトリ構造作成）
2. □ 依存パッケージ追加（Fastify, Prisma, Zod, Winston）
3. □ 各Phaseを順次実行
4. □ 完了後にmainへマージ

## タイムライン見積もり

- Phase 1-2: 2-3日
- Phase 3-4: 1-2日
- Phase 5: 2-3日（データ移行含む）
- Phase 6-7: 2-3日
- Phase 8: 将来実装

**合計**: 約1-2週間
