# リファクタリング実行計画

## 戦略: デプロイ優先アプローチ

**基本方針**: 
1. **まず動かす** - 現在のコードをOracle Cloudで稼働させる（最優先）
2. **段階的改善** - 本番稼働後、少しずつリファクタリング
3. **継続的デリバリー** - 各ステップで動作確認しながら進める

**最終目標**:
1. ✅ Oracle Cloud Always Freeでの安定稼働（データ永続化）
2. ✅ 段階的なコード品質向上（リファクタリング）
3. ✅ WebUIでのBot設定管理（将来実装）
4. ✅ Kubernetes移行の準備（将来）

## 現状の問題点

> **詳細**: 全16項目の問題分析は [CURRENT_ISSUES.md](design/CURRENT_ISSUES.md) を参照

### 🔴 重大な問題（High Priority）

#### 1. データ永続化の欠如
- **現在**: SQLiteパスがハードコード（`sqlite://storage/db.sqlite`）
- **問題**: Oracle Cloudでコンテナ再起動時にデータ消失（致命的）
- **対策**: docker-compose volumes (bind mount) + 環境変数化
- **Phase**: 1（最優先）

#### 2. 国際化（i18n）の設計問題
- **現在**: グローバル言語設定（`process.env.LOCALE`）
- **問題**: Guild別の言語設定不可、WebUIで変更不可
- **対策**: `GuildConfig.locale`追加、動的言語取得
- **Phase**: 3（本番稼働後）

#### 3. 環境変数の型安全性欠如
- **現在**: バリデーションなし（`process.env.TOKEN || ""`）
- **問題**: 空文字でも起動、デプロイ後にエラー
- **対策**: 簡易バリデーション（Phase 1）、Zodバリデーション（Phase 2以降）
- **Phase**: 1で簡易対応、2で本格対応

#### 4. ロガーの出力先問題
- **現在**: log4jsでファイル出力のみ
- **問題**: `docker logs`で閲覧不可、永続化なし
- **対策**: console.log追加（Phase 1）、Winston移行（Phase 2以降）
- **Phase**: 1で最小限対応、2で本格対応

#### 5. エラーハンドリングの不一致
- **現在**: 場所によって処理が異なる
- **問題**: デバッグ困難、予期しない停止
- **対策**: グローバルエラーハンドラ、統一処理
- **Phase**: 2-3（本番稼働後）

### 🟡 中程度の問題（Medium Priority）

#### 6. データアクセス層の設計問題
- **現在**: 141行の冗長コード、型安全性なし
- **問題**: メソッド数爆発、テスト困難
- **対策**: Repositoryパターン、型安全な設計
- **Phase**: 3（本番稼働後）

#### 7. ディレクトリ構造の問題
- **現在**: フラット構造、レイヤー分離なし
- **問題**: Webサーバー実装不可、スケール困難
- **対策**: 3層構造（Bot/Server/Shared）
- **Phase**: 2以降（WebUI実装時）

#### 8. 依存関係の問題
- **現在**: log4js使用、Prisma/Zod/Fastify未導入
- **問題**: 設計ドキュメントと乖離
- **対策**: 必要に応じて段階的に追加
- **Phase**: 2以降（必要になったら）

#### 9. セキュリティ問題
- **現在**: エラー詳細漏洩、入力バリデーション不足
- **問題**: 機密情報露出の可能性
- **対策**: エラーマスキング、Zod検証強化
- **Phase**: 4-5（WebUI実装時）

#### 10. タイマー処理の問題
- **現在**: setInterval、Bot再起動で消失
- **問題**: メモリリーク、スケールしない
- **対策**: node-cronスケジューラ、ジョブ復元処理
- **Phase**: 3（本番稼働後）

### 🟢 その他の問題（Low Priority）

11. **テストコード欠如** → Phase 5以降で対応
12. **TypeScript型活用不足** → 継続的改善
13. **ドキュメント乖離** → ✅ 解消済み
14. **Docker環境未整備** → Phase 1で対応
15. **CI/CD未整備** → Phase 5以降で構築

## リファクタリング全体計画

### Phase 1: Oracle Cloud デプロイ 🚀 【最優先・2-3日】
**目標**: 現在のコードを本番環境で稼働させる

**解決する問題**: #1データ永続化（最重要）、#14 Docker環境

**作業時間**: 4-6時間

---

#### Step 1.1: データベース緊急対応【1-2時間】🚨

> **詳細手順**: [DATA_PERSISTENCE_MIGRATION_PLAN.md - Phase 1](design/DATA_PERSISTENCE_MIGRATION_PLAN.md#phase-1-緊急対応即時実施1-2時間)

**現状**: db.sqliteが破損状態（malformed database schema）、extracted-data.txtに復元可能データあり

**タスク**:
1. □ 破損したDBの再構築
   ```bash
   mv storage/db.sqlite storage/db.sqlite.corrupted
   sqlite3 storage/db.sqlite "CREATE TABLE keyv(key VARCHAR(255) PRIMARY KEY, value TEXT);"
   ```
2. □ KeyvsErrorの自動リセット削除（データ消失防止）
   - `src/services/keyvs.ts`のエラー時の`setkeyv()`削除
3. □ 既存データの手動復元（extracted-data.txtから）

**検証**:
- ✅ Botが起動してコマンドが動作
- ✅ KeyvsError発生時にデータが消えない

---

#### Step 1.2: データ永続化設定【1時間】

**タスク**:

1. □ **SQLiteパスを環境変数化**
   ```typescript
   // src/services/keyvs.ts
   const dbPath = process.env.DATABASE_URL || 'sqlite://storage/db.sqlite';
   ```

2. □ **.env.example作成**
   ```env
   DISCORD_TOKEN=your-token-here
   DISCORD_APP_ID=your-app-id-here
   DATABASE_URL=sqlite:///app/storage/db.sqlite
   LOCALE=ja
   NODE_ENV=production
   ```

3. □ **docker-compose.yml修正**
   ```yaml
   version: '3.8'
   services:
     bot:
       build: .
       volumes:
         - ./storage:/app/storage  # データ永続化
         - ./logs:/app/logs        # ログ永続化
       env_file:
         - .env
       restart: unless-stopped
   ```

4. □ **簡易的な環境変数チェック追加**
   ```typescript
   // src/main.ts
   if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_APP_ID) {
     console.error('ERROR: DISCORD_TOKEN and DISCORD_APP_ID are required');
     process.exit(1);
   }
   ```

**検証**:
- ✅ `docker compose restart`後もデータが残る
- ✅ 環境変数が未設定の場合、起動時にエラー

---

#### Step 1.3: Docker最適化【1-2時間】

**タスク**:

1. □ **.dockerignoreファイル作成**
   ```
   .git
   node_modules
   docs
   .env
   storage/*.corrupted
   logs
   *.md
   ```

2. □ **Dockerfileの最適化**
   ```dockerfile
   FROM node:20-slim
   
   WORKDIR /app
   
   # pnpmインストール
   RUN npm install -g pnpm
   
   # 依存関係を先にコピー（キャッシュ活用）
   COPY package.json pnpm-lock.yaml ./
   RUN pnpm install --frozen-lockfile --prod
   
   # ソースコードをコピー
   COPY . .
   
   # TypeScriptビルド
   RUN pnpm build
   
   # ストレージディレクトリ作成
   RUN mkdir -p /app/storage /app/logs
   
   CMD ["node", "dist/main.js"]
   ```

3. □ **ログ出力の改善**
   ```typescript
   // src/services/logger.ts（既存ファイル）
   // log4jsのconsole appenderを追加
   log4js.configure({
     appenders: {
       file: { type: 'file', filename: 'logs/bot.log' },
       console: { type: 'console' }  // 追加
     },
     categories: {
       default: { appenders: ['file', 'console'], level: 'info' }  // console追加
     }
   });
   ```

**検証**:
- ✅ `docker compose build`が成功
- ✅ `docker compose logs -f`でログが見える
- ✅ イメージサイズが適切

---

#### Step 1.4: Oracle Cloud デプロイ【1-2時間】

> **詳細手順**: [DEPLOYMENT.md](deployment/DEPLOYMENT.md)

**タスク**:

1. □ **Oracle Cloud Compute Instance作成**
   - Always Free Tier (Ampere A1)
   - Ubuntu 22.04
   - SSH鍵設定

2. □ **サーバーセットアップ**
   ```bash
   # Dockerインストール
   sudo apt update
   sudo apt install docker.io docker-compose -y
   sudo usermod -aG docker $USER
   
   # リポジトリクローン
   git clone https://github.com/sonozakiSZ/guild-mng-bot.git
   cd guild-mng-bot
   git checkout refactor/webui-ready
   ```

3. □ **.env設定**
   ```bash
   cp .env.example .env
   nano .env  # トークン等を設定
   ```

4. □ **起動**
   ```bash
   docker compose up -d
   docker compose logs -f
   ```

5. □ **動作確認**
   - Discordでbotがオンライン
   - コマンドが動作
   - データが永続化

**検証**:
- ✅ Oracle Cloudで稼働
- ✅ コンテナ再起動後もデータが残る
- ✅ ログが`docker compose logs`で確認できる

---

### 🎉 Phase 1完了時点の状態

- ✅ **本番稼働中** - Oracle Cloudで安定稼働
- ✅ **データ永続化** - コンテナ再起動に耐える
- ✅ **運用可能** - ログ確認、バックアップ可能
- ⏸️ **リファクタリングは後回し** - 動くシステムを優先

---

### Phase 2: 基盤リファクタリング 【本番稼働後・任意のタイミング】
**目標**: コード品質向上の基盤を整える

**解決する問題**: #3環境変数, #4ロガー, #5エラーハンドリング, #8依存関係, #10タイマー処理

**作業時間**: 12-16時間

**タスク**:
1. □ **依存関係追加**（30分）
   ```bash
   pnpm add winston winston-daily-rotate-file
   pnpm add zod
   pnpm add node-cron @types/node-cron
   pnpm remove log4js
   ```

2. □ **Winston導入**（2-3時間）【問題#4対応】
   - log4js置き換え
   - stdout + file出力設定
   - ログレベル管理

3. □ **Zodバリデーション導入**（1-2時間）【問題#3対応】
   - 環境変数スキーマ定義
   - 起動時バリデーション

4. □ **Shared Layer構築**（2-3時間）
   - `src/shared/`ディレクトリ作成
   - 型定義（types/）
   - ユーティリティ（utils/）

5. □ **カスタムエラークラス実装**（1-2時間）【問題#5対応】
   - BaseError、ValidationError等
   - グローバルエラーハンドラ

6. □ **エラーハンドリング統一**（2-3時間）【問題#5対応】
   - 全コマンド・イベントに統一エラーハンドラ適用
   - エラーログの標準化
   - ユーザーフレンドリーなエラーメッセージ

7. □ **タイマー処理改善**（2-3時間）【問題#10対応】
   - setInterval → node-cron移行
   - ジョブ復元処理実装（Bot再起動時）
   - グレースフルシャットダウン対応

8. □ **簡易コマンド改善**（1時間）
   - help表示の改善
   - 基本的なエラーメッセージ統一

**成果物**: 
- Winston Logger（stdout + file）
- 型安全な環境変数管理
- 基盤コード（`src/shared/`）
- 統一されたエラーハンドリング
- node-cronベースのタイマー処理
- 改善されたコマンド構造（準備）

---

### Phase 3: データアクセス層 + Botコマンドリファクタリング 【本番稼働後・任意のタイミング】
**目標**: Repositoryパターン導入 + コマンド体系の改善

**解決する問題**: #6データアクセス層, #2 i18n, コマンド一貫性

**作業時間**: 24-32時間（Phase 3.1: 14-18時間 + Phase 3.2: 10-14時間 + Phase 3.3: 1-2時間）

> **詳細**: [DATA_PERSISTENCE_MIGRATION_PLAN.md - Phase 2](design/DATA_PERSISTENCE_MIGRATION_PLAN.md#phase-2-repositoryパターン導入1週間以内14-18時間)  
> **詳細**: [BOT_FEATURES_ANALYSIS.md](design/BOT_FEATURES_ANALYSIS.md) - 全22機能の詳細分析

---

#### Phase 3.1: Repositoryパターン導入【14-18時間】

**タスク**:
1. □ **Repository実装**（141行→50行）
   - 型定義作成（GuildConfig）
   - インターフェース定義（IGuildConfigRepository）
   - Keyv実装（KeyvGuildConfigRepository）
   - DIコンテナ設定

2. □ **シンプルなコマンドの移行**（4-6時間）
   - cnf-afk（AFK設定）
   - cnf-prof-channel（プロフィールチャンネル設定）
   - cnf-bump-reminder（Bumpリマインダー設定）
   - leave-member-log（退出ログ設定）

3. □ **複雑なコマンドの移行**（6-8時間）
   - cnf-vac（VC自動作成設定）
   - stick-message（スティックメッセージ）⭐⭐⭐⭐⭐

4. □ **イベントハンドラの移行**（4-6時間）
   - voiceStateUpdate
   - messageCreate
   - guildMemberRemove
   - その他イベント

**成果物**:
- 型安全なデータアクセス層
- Repository パターン実装コード

---

#### Phase 3.2: コマンド体系リファクタリング【10-14時間】

> **詳細分析**: [BOT_FEATURES_ANALYSIS.md](design/BOT_FEATURES_ANALYSIS.md)

**タスク**:

1. □ **コマンド名変更**（2-3時間）
   - 個別設定確認: `status` → `show-setting`
   - 全体設定確認: `status-list` → `show-settings`
   - 冗長コマンド削除: `get-dest`削除（statusに統合済み）

2. □ **コマンドファイル名変更**（1時間）
   ```bash
   # 新しい命名規則
   src/commands/
     show-setting.ts      # 個別設定確認（旧: status）
     show-settings.ts     # 全体設定確認（旧: statusList）
     # get-dest.ts は削除
   ```

3. □ **show-setting実装改善**（3-4時間）
   - 各コマンドにサブコマンドとして実装
   - 統一されたレスポンスフォーマット
   - 設定未設定時の適切なメッセージ
   ```typescript
   // 例: /cnf-afk show-setting
   // 例: /cnf-vac show-setting
   // 例: /stick-message show-setting
   ```

4. □ **show-settings実装改善**（4-6時間）
   - Repository パターンを活用した実装
   - 見やすいEmbed表示
   - 設定済み/未設定の明確な区別
   - エクスポート機能（JSON形式）
   ```typescript
   // /show-settings
   // → 全機能の設定状態を一覧表示
   ```

5. □ **ヘルプ表示の更新**（1時間）
   - 新しいコマンド名を反映
   - 使用例の追加

**成果物**:
- 一貫性のあるコマンド体系
- show-setting/show-settingsコマンド
- 削減されたコマンド数（get-dest削除）

---

#### Phase 3.3: i18n改善【1-2時間】

**タスク**:
1. □ **Guild別言語対応**（i18n改善）
   - GuildConfigにlocaleフィールド追加
   - 動的言語取得実装
   - デフォルト言語（ja）設定

**成果物**:
- Guild別言語設定機能
- 動的な言語切り替え

---

### Phase 3完了時の状態

**コマンド体系**:
```
設定系コマンド（13個）
├─ /cnf-afk [show-setting]          # AFK設定
├─ /cnf-prof-channel [show-setting] # プロフィールチャンネル
├─ /cnf-vac [show-setting]          # VC自動作成
├─ /cnf-bump-reminder [show-setting] # Bumpリマインダー
├─ /stick-message [show-setting]    # スティックメッセージ
├─ /leave-member-log [show-setting] # 退出ログ
└─ ... その他

確認系コマンド（2個 → 1個に削減）
├─ /show-settings                   # 全体設定確認（旧: status-list）
└─ [各コマンドのshow-settingサブコマンド] # 個別確認（旧: status, get-dest）
```

**改善点**:
- ✅ コマンド名が明確（show-setting, show-settings）
- ✅ 冗長なコマンド削除（get-dest）
- ✅ Repository パターンで型安全
- ✅ 141行 → 50行（65%削減）
- ✅ テスト可能な設計
- ✅ Guild別言語対応（i18n）

**Phase 2で既に実装済み**:
- ✅ 統一されたエラーハンドリング
- ✅ node-cronベースのタイマー処理

---

---

### Phase 4: テスト・CI/CD 【本番稼働後・推奨】
**目標**: 品質保証と自動デプロイの整備

**解決する問題**: #11テストコード, #15 CI/CD

**作業時間**: 8-12時間

**タスク**:
1. □ **Jestセットアップ**（1時間）
   ```bash
   pnpm add -D jest @types/jest ts-jest
   ```

2. □ **基本的なテスト作成**（3-4時間）
   - Utility関数のテスト
   - Repository層のテスト（モック使用）
   - バリデーションのテスト

3. □ **GitHub Actions CI/CD構築**（4-6時間）
   - `.github/workflows/ci.yml`（PR用テスト）
   - `.github/workflows/deploy.yml`（mainブランチ用自動デプロイ）

4. □ **デプロイ自動化**（1-2時間）
   - Oracle Cloud InstanceへSSH経由デプロイ
   - GitHub Secrets設定（SSH鍵、トークン等）
   - デプロイ後の動作確認自動化

**成果物**:
- Jest環境
- 基本的なユニットテスト
- CI/CDパイプライン
- 自動デプロイ機能

**検証**:
- ✅ PRでテストが自動実行
- ✅ mainブランチへのpushで自動デプロイ
- ✅ デプロイ後にBotが正常稼働

---

### Phase 5: WebUI/Server層の実装 【将来・WebUI実装時】
**目標**: WebUIのためのREST API

**解決する問題**: #7ディレクトリ構造, #9セキュリティ

**作業時間**: 16-24時間

**タスク**:
1. □ `src/server/`ディレクトリ作成
2. □ Fastify セットアップ
3. □ REST API実装（Guild設定CRUD）
4. □ 認証・認可実装（Discord OAuth2）
5. □ セキュリティ設定（CORS, Helmet, レート制限）
6. □ フロントエンド雛形（Vite + React）

**成果物**:
- REST API
- 認証機構
- WebUI雛形

---

## タイムライン

### 🎯 即時実施（今週中）
**Phase 1 → Phase 4の順で実施推奨**

#### Step 1: 本番環境デプロイ
- **Phase 1**: Oracle Cloud デプロイ（4-6時間）
  - ✅ 本番稼働開始
  - ✅ データ永続化完了
  - ⚠️ まだ手動デプロイ

#### Step 2: 自動化整備（Phase 1直後に推奨）
- **Phase 4**: テスト・CI/CD（8-12時間）
  - ✅ 自動テスト整備
  - ✅ 自動デプロイ整備
  - ✅ 以降、コード変更を自動で本番反映可能に

**Phase 1 + Phase 4完了後**: 自動デプロイ環境が整い、リファクタリングを安全に進められる 🎉

---

### 📅 任意のタイミング（自動デプロイ環境完成後）
- **Phase 2**: 基盤リファクタリング（12-16時間）
  - Winston、Zod、エラーハンドリング、タイマー処理
  - 完了後、自動デプロイで本番反映
  
- **Phase 3**: データアクセス層+コマンドリファクタリング（24-32時間）
  - Repository パターン導入
  - コマンド体系改善（show-setting/show-settings）
  - 完了後、自動デプロイで本番反映

---

### 🔮 将来（WebUI実装時）
- **Phase 5**: WebUI/Server層実装（16-24時間）

---
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
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { config } from '../config';

const logDir = process.env.LOG_DIR || '/app/storage/logs';

// ファイル用フォーマット
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.json(),
  transports: [
    // 標準出力（docker logs用）
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // ファイル出力 - エラーログ
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
    
    // ファイル出力 - 日付別ローテーション
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d', // 14日間保持
      format: fileFormat,
      zippedArchive: true,
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

**ファイル**: `src/main.ts`

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

**コミット**: `refactor: restructure main.ts with layered architecture`

---

## ロールバック計画

各Phaseごとにブランチを保持し、問題発生時にロールバック可能にする。

```bash
# Phase完了時
git tag phase-1-complete
git push origin phase-1-complete
```

---

## 次のステップ

### 🎯 推奨実施順序

#### **Week 1: Phase 1 + Phase 4（12-18時間）**

**Phase 1: Oracle Cloud デプロイ（4-6時間）**
1. Step 1.1: DB破損修復（1-2時間）
2. Step 1.2: データ永続化設定（1時間）
3. Step 1.3: Docker最適化（1-2時間）
4. Step 1.4: Oracle Cloudデプロイ（1-2時間）
   
   **✅ 完了後**: 本番稼働開始（手動デプロイ）

---

**Phase 4: テスト・CI/CD（8-12時間）** ← Phase 1直後に実施
1. Jestセットアップ（1時間）
2. 基本的なテスト作成（3-4時間）
3. GitHub Actions CI/CD構築（4-6時間）
4. 自動デプロイ整備（1-2時間）
   
   **✅ 完了後**: 自動デプロイ環境完成 🎉

---

#### **Week 2以降: Phase 2 → Phase 3（任意のタイミング）**

リファクタリングを進めて、自動デプロイで本番反映

---

### 🚀 今すぐ始める（Phase 1, Step 1.1）

```bash
cd /home/shun/dev/guild-mng-bot
mv storage/db.sqlite storage/db.sqlite.corrupted
sqlite3 storage/db.sqlite "CREATE TABLE keyv(key VARCHAR(255) PRIMARY KEY, value TEXT);"
```

---

## 関連ドキュメント

### 📐 設計・分析ドキュメント
- **[ARCHITECTURE.md](design/ARCHITECTURE.md)** - 全体アーキテクチャ設計
- **[CURRENT_ISSUES.md](design/CURRENT_ISSUES.md)** - 詳細な問題分析（16項目）
- **[BOT_FEATURES_ANALYSIS.md](design/BOT_FEATURES_ANALYSIS.md)** - Bot機能の詳細分析とリファクタリング評価
- **[DATA_PERSISTENCE_MIGRATION_PLAN.md](design/DATA_PERSISTENCE_MIGRATION_PLAN.md)** - データ移行の詳細手順（Phase 1-3）
- **[DATABASE_REFACTORING_STATUS.md](design/DATABASE_REFACTORING_STATUS.md)** - データベース設計の詳細分析
- **[DATABASE_MIGRATION.md](design/DATABASE_MIGRATION.md)** - PostgreSQL移行計画（将来）

### 🚀 デプロイ関連ドキュメント
- **[DEPLOYMENT.md](deployment/DEPLOYMENT.md)** - Oracle Cloudデプロイ手順
- **[MIGRATION_PATHS.md](deployment/MIGRATION_PATHS.md)** - プラットフォーム移行オプション
- **[MULTI_BOT.md](deployment/MULTI_BOT.md)** - 複数bot運用計画（将来）

### 🔧 開発ガイド
- **[API_DESIGN.md](design/API_DESIGN.md)** - WebUI API設計（将来）

---

## 変更履歴

- 2026-01-23: **デプロイ優先アプローチに変更** - Oracle Cloud稼働を最優先に
- 2026-01-23: Phase構成を再編成（Phase 1 = デプロイ、Phase 2-3 = リファクタリング）
- 2026-01-23: ドキュメント構造を再編成（design/, deployment/ 配下に整理）