# データベース移行計画

## 概要

このドキュメントでは、データ永続化の戦略選択と、将来的なPostgreSQL移行について説明します。

## データ永続化戦略の選択

### オプション1: ローカルストレージ + SQLite（推奨 - 現段階）

**概要**: 既存のSQLite + Keyvをそのまま使用し、docker-compose volumesで永続化

#### メリット
- ✅ **最小限の変更**: 既存コードをほぼそのまま使用可能
- ✅ **完全無料**: Oracle Cloud Always Freeのローカルストレージを使用
- ✅ **シンプル**: セットアップが簡単
- ✅ **低レイテンシ**: ローカルファイルアクセスで高速
- ✅ **軽量**: メモリ・CPU消費が少ない
- ✅ **容量十分**: 47GB boot volume（現状のデータ量で十分）

#### デメリット
- ❌ **スケール不可**: 単一インスタンスのみ（複数マシンで共有不可）
- ❌ **手動バックアップ**: 自動バックアップ機能なし
- ❌ **高可用性なし**: マシン故障時にダウンタイム発生

#### セットアップ手順

```yaml
# docker-compose.yml に設定
services:
  bot:
    image: guild-mng-bot:latest
    volumes:
      - ./storage:/app/storage  # ローカルディレクトリをマウント
    environment:
      - DATABASE_URL=sqlite:///app/storage/db.sqlite
```

```typescript
// src/shared/config/index.ts
export const config = {
  // ...
  databaseUrl: process.env.DATABASE_URL || 'sqlite:///app/storage/db.sqlite',
};
```

#### バックアップ戦略

```bash
# 定期的に手動バックアップ（cronで自動化可能）
ssh -i ~/.ssh/oracle_cloud ubuntu@<INSTANCE_IP>
cd ~/guild-mng-bot
tar -czf ~/backups/backup-$(date +%Y%m%d).tar.gz ./storage

# ローカルにダウンロード
scp -i ~/.ssh/oracle_cloud ubuntu@<INSTANCE_IP>:~/backups/backup-20260123.tar.gz ./
```

#### この方式が適している場合
- ✅ 個人・小規模Bot（現状のguild-mng-bot）
- ✅ 単一インスタンスで十分
- ✅ データ量が少ない（数MB〜数十MB）
- ✅ ダウンタイム許容可能
- ✅ コストを抑えたい

---

### オプション2: PostgreSQL + Prisma（将来検討）

**概要**: PostgreSQLへ移行し、Prisma ORMで管理（Oracle Cloud上でDockerコンテナとして稼働）

#### メリット
- ✅ **スケーラブル**: 複数Botインスタンスで共有可能
- ✅ **WebUI対応**: 複数サーバー（Bot + WebAPI）からアクセス可能
- ✅ **本番向け**: エンタープライズ用途に適している
- ✅ **完全無料**: Oracle Cloud Always Free内で稼働可能
- ✅ **データ整合性**: ACID準拠、トランザクション対応

#### デメリット
- ❌ **複雑**: セットアップ・運用が複雑
- ❌ **ネットワークレイテンシ**: コンテナ間通信で若干遅延
- ❌ **リソース消費**: PostgreSQLコンテナ分のメモリ・CPU消費
- ❌ **移行作業**: データ移行スクリプトが必要

#### この方式が適している場合
- ✅ WebUIを本格実装予定
- ✅ 複数インスタンスでスケール必要
- ✅ データ量が増加（100MB超）
- ✅ 高可用性が必須
- ✅ 本番環境での安定運用重視

---

### 推奨アプローチ: 段階的移行

**Phase 1（現在）**: ローカルストレージ + SQLite
- 既存コードそのまま
- 最小限の変更でOracle Cloudデプロイ
- docker-compose volumesで永続化
- コスト: $0

**Phase 2（将来 - WebUI実装時）**: PostgreSQL移行検討
- 以下の条件を満たしたら移行:
  - WebUIを実装する
  - 複数インスタンスが必要になる
  - データ量が1GB超える
  - 高可用性が求められる
  - 複数Botで同一DBを共有したい

---

## PostgreSQL移行（将来実装用）

以下は、将来Postgresへ移行する際の詳細手順です。現時点では実装不要です。

## 現状分析（参考情報）

> **注**: このセクションは将来のPostgres移行時の参考情報です。
> 現段階では既存のSQLite + Keyvを**そのまま使用**し、docker-compose volumesで永続化します。

### 現在のデータ構造（Keyv）

```
storage/db.sqlite
├── keyv (テーブル)
│   ├── key: "{guildId}:destAfkVcId" → value: "channelId"
│   ├── key: "{guildId}:vcAutoCreation/triggerVcIds" → value: ["id1", "id2"]
│   ├── key: "{guildId}:vcAutoCreation/channelIds" → value: ["id1", "id2"]
│   ├── key: "{guildId}:profChannelId" → value: "channelId"
│   ├── key: "{guildId}:bumpReminder/isEnabled" → value: true
│   ├── key: "{guildId}:bumpReminder/mentionRoleId" → value: "roleId"
│   ├── key: "{guildId}:bumpReminder/remindDate" → value: 1234567890
│   ├── key: "{guildId}:bumpReminder/mentionUserIds" → value: ["id1"]
│   ├── key: "{guildId}:stickMessage/channelIdMessageIdPairs" → value: [[ch,msg]]
│   └── key: "{guildId}:leaveMemberLog/channelId" → value: "channelId"
```

### 問題点

1. **フラットな構造**: ネストしたデータがJSON文字列
2. **型安全性なし**: 値がany型
3. **クエリ困難**: Key-Value形式で検索・集計が難しい
4. **スケーラビリティ**: SQLiteはマルチインスタンス非対応

## 新しいデータ構造（Prisma）

### スキーマ設計

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model GuildConfig {
  id        String   @id @default(cuid())
  guildId   String   @unique @map("guild_id")
  
  // AFK設定
  afkVoiceChannelId String?  @map("afk_voice_channel_id")
  
  // プロフィールチャンネル
  profChannelId     String?  @map("prof_channel_id")
  
  // ボイスチャンネル自動作成
  vacTriggerVcIds   String[] @map("vac_trigger_vc_ids") @default([])
  vacChannelIds     String[] @map("vac_channel_ids") @default([])
  
  // Bumpリマインダー
  bumpReminderEnabled       Boolean  @default(false) @map("bump_reminder_enabled")
  bumpReminderMentionRoleId String?  @map("bump_reminder_mention_role_id")
  bumpReminderRemindDate    BigInt?  @map("bump_reminder_remind_date")
  bumpReminderMentionUserIds String[] @default([]) @map("bump_reminder_mention_user_ids")
  
  // スティックメッセージ（関連テーブル）
  stickMessages     StickMessage[]
  
  // 退出ログ
  leaveMemberLogChannelId String? @map("leave_member_log_channel_id")
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@map("guild_configs")
}

model StickMessage {
  id       String      @id @default(cuid())
  guildId  String      @map("guild_id")
  channelId String     @map("channel_id")
  messageId String     @map("message_id")
  
  config   GuildConfig @relation(fields: [guildId], references: [guildId], onDelete: Cascade)
  
  createdAt DateTime   @default(now()) @map("created_at")
  
  @@unique([channelId, messageId])
  @@map("stick_messages")
}
```

### モデル型（TypeScript）

```typescript
// src/shared/types/config.ts

export interface GuildConfig {
  id: string;
  guildId: string;
  afkVoiceChannelId?: string;
  profChannelId?: string;
  vacTriggerVcIds: string[];
  vacChannelIds: string[];
  bumpReminder: {
    enabled: boolean;
    mentionRoleId?: string;
    remindDate?: number;
    mentionUserIds: string[];
  };
  stickMessages: StickMessage[];
  leaveMemberLogChannelId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StickMessage {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  createdAt: Date;
}
```

## 移行手順

### Step 1: Prisma セットアップ

```bash
# Prismaインストール
pnpm add -D prisma
pnpm add @prisma/client

# 初期化
pnpm prisma init

# スキーマ作成（上記を prisma/schema.prisma に記述）
```

### Step 2: ローカルPostgreSQLセットアップ

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: guild_mng_bot
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: guild_mng_bot_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# 起動
docker-compose -f docker-compose.dev.yml up -d

# .envに設定
echo "DATABASE_URL=postgresql://guild_mng_bot:devpassword@localhost:5432/guild_mng_bot_dev" >> .env
```

### Step 3: マイグレーション作成

```bash
# 初回マイグレーション
pnpm prisma migrate dev --name init

# マイグレーションファイルが生成される
# prisma/migrations/20260122_init/migration.sql
```

### Step 4: データ移行スクリプト作成

```typescript
// scripts/migrate-from-sqlite.ts

import Keyv from 'keyv';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const keyv = new Keyv('sqlite://storage/db.sqlite');

interface KeyvData {
  guildId: string;
  destAfkVcId?: string;
  vacTriggerVcIds?: string[];
  vacChannelIds?: string[];
  profChannelId?: string;
  isBumpReminderEnabled?: boolean;
  bumpReminderMentionRoleId?: string;
  bumpReminderRemindDate?: number;
  bumpReminderMentionUserIds?: string[];
  stickMessages?: Array<[string, string]>;
  leaveMemberLogChannelId?: string;
}

async function extractGuildIds(): Promise<string[]> {
  // Keyvから全キーを取得してguildIdを抽出
  const keys = await getAllKeys(keyv);
  const guildIds = new Set<string>();
  
  for (const key of keys) {
    const [guildId] = key.split(':');
    if (guildId) guildIds.add(guildId);
  }
  
  return Array.from(guildIds);
}

async function migrateGuildConfig(guildId: string): Promise<void> {
  console.log(`Migrating guild: ${guildId}`);
  
  // Keyvから全設定を取得
  const destAfkVcId = await keyv.get(`${guildId}:destAfkVcId`);
  const vacTriggerVcIds = await keyv.get(`${guildId}:vcAutoCreation/triggerVcIds`) || [];
  const vacChannelIds = await keyv.get(`${guildId}:vcAutoCreation/channelIds`) || [];
  const profChannelId = await keyv.get(`${guildId}:profChannelId`);
  const isBumpReminderEnabled = await keyv.get(`${guildId}:bumpReminder/isEnabled`) || false;
  const bumpReminderMentionRoleId = await keyv.get(`${guildId}:bumpReminder/mentionRoleId`);
  const bumpReminderRemindDate = await keyv.get(`${guildId}:bumpReminder/remindDate`);
  const bumpReminderMentionUserIds = await keyv.get(`${guildId}:bumpReminder/mentionUserIds`) || [];
  const stickMessages = await keyv.get(`${guildId}:stickMessage/channelIdMessageIdPairs`) || [];
  const leaveMemberLogChannelId = await keyv.get(`${guildId}:leaveMemberLog/channelId`);
  
  // Prismaにupsert
  await prisma.guildConfig.upsert({
    where: { guildId },
    create: {
      guildId,
      afkVoiceChannelId: destAfkVcId,
      vacTriggerVcIds,
      vacChannelIds,
      profChannelId,
      bumpReminderEnabled: isBumpReminderEnabled,
      bumpReminderMentionRoleId,
      bumpReminderRemindDate: bumpReminderRemindDate ? BigInt(bumpReminderRemindDate) : null,
      bumpReminderMentionUserIds,
      leaveMemberLogChannelId,
      stickMessages: {
        create: stickMessages.map(([channelId, messageId]) => ({
          channelId,
          messageId,
        })),
      },
    },
    update: {
      afkVoiceChannelId: destAfkVcId,
      vacTriggerVcIds,
      vacChannelIds,
      profChannelId,
      bumpReminderEnabled: isBumpReminderEnabled,
      bumpReminderMentionRoleId,
      bumpReminderRemindDate: bumpReminderRemindDate ? BigInt(bumpReminderRemindDate) : null,
      bumpReminderMentionUserIds,
      leaveMemberLogChannelId,
    },
  });
  
  console.log(`✓ Migrated guild: ${guildId}`);
}

async function main() {
  console.log('Starting migration from SQLite to PostgreSQL...\n');
  
  const guildIds = await extractGuildIds();
  console.log(`Found ${guildIds.length} guilds to migrate\n`);
  
  for (const guildId of guildIds) {
    try {
      await migrateGuildConfig(guildId);
    } catch (error) {
      console.error(`✗ Failed to migrate guild ${guildId}:`, error);
    }
  }
  
  console.log('\n✓ Migration completed');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

// ヘルパー関数
async function getAllKeys(keyv: Keyv): Promise<string[]> {
  // SQLiteから直接キーを取得
  const db = (keyv as any).opts.store.db;
  const rows = await db.all('SELECT key FROM keyv');
  return rows.map((row: any) => row.key);
}
```

### Step 5: 移行実行

```bash
# バックアップ作成
cp storage/db.sqlite storage/db.sqlite.backup

# 移行スクリプト実行
pnpm tsx scripts/migrate-from-sqlite.ts

# 検証
pnpm prisma studio  # ブラウザでデータ確認
```

### Step 6: リポジトリ実装更新

```typescript
// src/shared/database/repositories/guild-config.repository.ts

import { prisma } from '../client';
import type { GuildConfig } from '../../types/config';

export class GuildConfigRepository {
  async getAfkVoiceChannelId(guildId: string): Promise<string | null> {
    const config = await prisma.guildConfig.findUnique({
      where: { guildId },
      select: { afkVoiceChannelId: true },
    });
    return config?.afkVoiceChannelId ?? null;
  }
  
  async setAfkVoiceChannelId(guildId: string, channelId: string): Promise<void> {
    await prisma.guildConfig.upsert({
      where: { guildId },
      create: { guildId, afkVoiceChannelId: channelId },
      update: { afkVoiceChannelId: channelId },
    });
  }
  
  async deleteAfkVoiceChannelId(guildId: string): Promise<void> {
    await prisma.guildConfig.update({
      where: { guildId },
      data: { afkVoiceChannelId: null },
    });
  }
  
  // ... 他のメソッド（同様のパターン）
  
  async getFullConfig(guildId: string): Promise<GuildConfig | null> {
    const data = await prisma.guildConfig.findUnique({
      where: { guildId },
      include: { stickMessages: true },
    });
    
    if (!data) return null;
    
    return {
      id: data.id,
      guildId: data.guildId,
      afkVoiceChannelId: data.afkVoiceChannelId ?? undefined,
      profChannelId: data.profChannelId ?? undefined,
      vacTriggerVcIds: data.vacTriggerVcIds,
      vacChannelIds: data.vacChannelIds,
      bumpReminder: {
        enabled: data.bumpReminderEnabled,
        mentionRoleId: data.bumpReminderMentionRoleId ?? undefined,
        remindDate: data.bumpReminderRemindDate ? Number(data.bumpReminderRemindDate) : undefined,
        mentionUserIds: data.bumpReminderMentionUserIds,
      },
      stickMessages: data.stickMessages.map(msg => ({
        id: msg.id,
        guildId: msg.guildId,
        channelId: msg.channelId,
        messageId: msg.messageId,
        createdAt: msg.createdAt,
      })),
      leaveMemberLogChannelId: data.leaveMemberLogChannelId ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}

export const guildConfigRepository = new GuildConfigRepository();
```

## PostgreSQL セットアップ（将来実装用）

### Step 1: PostgreSQL コンテナ追加

```yaml
# docker-compose.yml に追加
services:
  postgres:
    image: postgres:16-alpine
    container_name: guild-mng-bot-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-guild_bot}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-guild_mng_bot}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-guild_bot}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

```bash
# 環境変数設定（.env）
DB_USER=guild_bot
DB_PASSWORD=your-secure-password-here
DB_NAME=guild_mng_bot
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
```

### Step 2: 本番マイグレーション

```bash
# Prismaマイグレーション実行
docker compose exec bot npx prisma migrate deploy

# または、起動時に自動実行（package.json）
{
  "scripts": {
    "start": "npx prisma migrate deploy && node .build/src/main.js"
  }
}
```

## ロールバック計画

### 問題発生時の対処
docker compose down
git checkout <previous-commit>
docker compose up -d

# 2. データをSQLiteに戻す（逆移行スクリプト）
pnpm tsx scripts/migrate-to-sqlite.ts

# 3. 旧docker-compose.ymlでデプロイ
git checkout main -- docker-compose.yml
docker compose up -d
# 3. 旧Dockerfileでデプロイ
git checkout main -- Dockerfile
fly deploy
```

## テスト計画

### 移行後の検証項目

- [ ] 全ギルドのデータが移行されている
- [ ] AFK設定が動作する
- [ ] VAC（VC自動作成）が動作する
- [ ] Bumpリマインダーが動作する
- [ ] スティックメッセージが動作する
- [ ] 退出ログが動作する
- [ ] 新規ギルドへの参加が正常
- [ ] ギルドからの退出時にデータ削除される

### パフォーマンステスト

```typescript
// scripts/perf-test.ts

import { performance } from 'perf_hooks';
import { guildConfigRepository } from '../src/shared/database/repositories';

async function testReadPerformance() {
  const start = performance.now();
  
  for (let i = 0; i < 100; i++) {
    await guildConfigRepository.getFullConfig('test-guild-id');
  }
  
  const end = performance.now();
  console.log(`100 reads: ${end - start}ms (avg: ${(end - start) / 100}ms)`);
}

async function testWritePerformance() {
  const start = performance.now();
  
  for (let i = 0; i < 100; i++) {
    await guildConfigRepository.setAfkVoiceChannelId('test-guild-id', `channel-${i}`);
  }
  
  const end = performance.now();
  console.log(`100 writes: ${end - start}ms (avg: ${(end - start) / 100}ms)`);
}
```

**期待値**:
- 読み取り: 平均 < 10ms
- 書き込み: 平均 < 20ms

## メンテナンス

### マイグレーション追加時

```bash
# スキーマ変更
# 1. prisma/schema.prisma を編集

# 2. マイグレーション作成
pnpm prisma migrate dev --name add_new_field

# 3. 型生成
pnpm prisma generate

# 4. リポジトリコード更新
```

### データバックアップ
Oracle Cloud上でのPostgreSQLバックアップ
ssh -i ~/.ssh/oracle_cloud ubuntu@<INSTANCE_IP>

# PostgreSQLバックアップ
docker compose exec postgres pg_dump -U guild_bot guild_mng_bot > backup-$(date +%Y%m%d).sql

# または、docker execで直接
docker exec guild-mng-bot-db pg_dump -U guild_bot guild_mng_bot > backup.sql

# ローカルにダウンロード
scp -i ~/.ssh/oracle_cloud ubuntu@<INSTANCE_IP>:~/backup-20260123.sql ./
fly postgres connect -a guild-mng-bot-db
pg_dump -Fc guild_mng_bot_dev > backup.dump
```

##Oracle Cloud上での永続化対応
- 型安全なデータアクセス
- スケーラビリティ向上
- クエリ性能向上
- 複数Botインスタンスで共有可能

⚠️ **注意点**:
- 移行時のダウンタイム（数分）
- リソース消費増加（PostgreSQLコンテナ分）
- 複雑性の増加

🎯 **推奨**: Oracle Cloud Always Free内で完結。外部DBサービス（Supabase等）も選択肢
- 移行時のダウンタイム（数分）
- コスト増加（Fly Postgres有料）
- 複雑性の増加

🎯 **推奨**: Fly.io Postgresの代わりに、無料枠があるSupabase PostgreSQLも検討可能
