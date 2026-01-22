# データ永続化 移行計画

> **注記**: 本ドキュメントは[REFACTORING_PLAN.md](../REFACTORING_PLAN.md) Phase 2の詳細版です。  
> Phase 1 = Step 2.1（緊急対応）、Phase 2 = Step 2.2（Repositoryパターン）、Phase 3 = 将来のPostgreSQL移行

## 現状の問題点

### 1. 技術的な問題
- ✅ **データベース破損**: 現在のdb.sqliteが破損状態
- ✅ **Keyvの非効率な使用**: GuildごとにKeyvインスタンスを作成
- ✅ **型安全性の欠如**: getValue/setValueの戻り値がany
- ✅ **エラー処理の問題**: KeyvsError発生時に自動リセットでデータ消失
- ✅ **冗長なコード**: 141行のget/set/deleteメソッドが重複

### 2. アーキテクチャ上の問題
- namespace設計が非効率（Guild単位でKeyvインスタンス作成）
- マルチbot対応が困難（botID層が存在しない）
- テストが困難（インターフェースが未定義）

## 移行戦略: 3段階アプローチ

### Phase 1: 緊急対応（即時実施）【1-2時間】
**目的**: データベース破損の修正と最低限の動作保証

#### 手順
1. **データベースの再構築**
   ```bash
   # 破損したDBのバックアップ
   mv storage/db.sqlite storage/db.sqlite.corrupted
   
   # 新しいDBを作成（Botを起動すると自動作成される）
   # または手動で作成
   sqlite3 storage/db.sqlite "CREATE TABLE keyv(key VARCHAR(255) PRIMARY KEY, value TEXT);"
   ```

2. **データの手動移行（必要に応じて）**
   ```bash
   # extracted-data.txtから設定を手動で復元
   # 例: 955749995808702494 ギルドの設定を復元
   ```

3. **KeyvsErrorのリセット処理を無効化**
   - エラー時の自動`setkeyv()`を削除
   - エラーログとアラート通知に変更

**成果物**: 動作するデータベース、データ消失防止

---

### Phase 2: Repositoryパターン導入（1週間以内）【14-18時間】
**目的**: 型安全で保守性の高いデータアクセス層の構築

#### アーキテクチャ設計

```
src/
  shared/
    repositories/
      interfaces/
        IGuildConfigRepository.ts    # インターフェース
      implementations/
        KeyvGuildConfigRepository.ts # Keyv実装
      types/
        GuildConfig.ts               # 型定義
      index.ts
```

#### 実装手順

**Step 1: 型定義の作成**

```typescript
// src/shared/repositories/types/GuildConfig.ts
export interface GuildConfig {
  guildId: string;
  
  // AFK設定
  afk?: {
    destVcId: string;
  };
  
  // VC自動作成設定
  vcAutoCreation?: {
    triggerVcIds: string[];
    createdChannelIds: string[];
  };
  
  // プロフィールチャンネル
  profile?: {
    channelId: string;
  };
  
  // Bumpリマインダー
  bumpReminder?: {
    enabled: boolean;
    mentionRoleId?: string;
    remindDate?: number;
    mentionUserIds?: string[];
  };
  
  // スティックメッセージ
  stickMessage?: {
    channelMessagePairs: Record<string, string>;
  };
  
  // 退出ログ
  leaveMemberLog?: {
    channelId: string;
  };
}
```

**Step 2: インターフェース定義**

```typescript
// src/shared/repositories/interfaces/IGuildConfigRepository.ts
import { GuildConfig } from '../types/GuildConfig';

export interface IGuildConfigRepository {
  // 全設定の取得・保存
  get(guildId: string): Promise<GuildConfig | null>;
  save(config: GuildConfig): Promise<void>;
  delete(guildId: string): Promise<void>;
  
  // 個別設定の更新（便利メソッド）
  updateAfkConfig(guildId: string, destVcId: string | null): Promise<void>;
  updateVcAutoCreation(guildId: string, config: GuildConfig['vcAutoCreation']): Promise<void>;
  updateBumpReminder(guildId: string, config: GuildConfig['bumpReminder']): Promise<void>;
  // ... 他の設定も同様
}
```

**Step 3: Keyv実装**

```typescript
// src/shared/repositories/implementations/KeyvGuildConfigRepository.ts
import Keyv from 'keyv';
import { IGuildConfigRepository } from '../interfaces/IGuildConfigRepository';
import { GuildConfig } from '../types/GuildConfig';

export class KeyvGuildConfigRepository implements IGuildConfigRepository {
  private keyv: Keyv;
  
  constructor(databaseUrl: string) {
    this.keyv = new Keyv(databaseUrl, { 
      namespace: 'guild_config' 
    });
  }
  
  async get(guildId: string): Promise<GuildConfig | null> {
    const data = await this.keyv.get(guildId);
    if (!data) return null;
    return data as GuildConfig;
  }
  
  async save(config: GuildConfig): Promise<void> {
    await this.keyv.set(config.guildId, config);
  }
  
  async delete(guildId: string): Promise<void> {
    await this.keyv.delete(guildId);
  }
  
  async updateAfkConfig(guildId: string, destVcId: string | null): Promise<void> {
    const config = await this.get(guildId) || { guildId };
    
    if (destVcId === null) {
      delete config.afk;
    } else {
      config.afk = { destVcId };
    }
    
    await this.save(config);
  }
  
  // 他のメソッドも同様に実装...
}
```

**Step 4: 既存コードの移行**

```typescript
// Before (src/commands/cnfAfk.ts)
await discordBotKeyvs.setDestAfkVcId(interaction.guildId!, channel.id);

// After
const repo = container.resolve<IGuildConfigRepository>('GuildConfigRepository');
await repo.updateAfkConfig(interaction.guildId!, channel.id);
```

**移行の進め方**:
1. 新しいRepositoryを実装
2. 1つのコマンド（例: cnfAfk）で動作確認
3. 他のコマンドも順次移行
4. 全コマンド移行完了後、`discordBotKeyvs.ts`を削除

**メリット**:
- ✅ 型安全（TypeScriptの恩恵を最大限活用）
- ✅ テスト可能（モックRepositoryを簡単に作成可能）
- ✅ 141行→約50行に削減
- ✅ 将来の移行が容易（インターフェースは変更せず実装だけ変更）

---

### Phase 3: PostgreSQL移行準備（将来）【16-24時間】
**目的**: スケーラブルなデータベースへの移行とWebUI対応

#### タイミング
以下のいずれかの条件を満たした時点で実施:
- WebUIの本格実装を開始する時
- 複数botインスタンスの稼働が必要になった時
- データ量が100MBを超えた時

#### 実装手順

**Step 1: Prismaのセットアップ**

```bash
npm install prisma @prisma/client
npx prisma init
```

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
  id        String   @id @default(uuid())
  guildId   String   @unique
  config    Json     // GuildConfigの全データをJSONで保存
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([guildId])
}
```

**Step 2: Prisma実装の追加**

```typescript
// src/shared/repositories/implementations/PrismaGuildConfigRepository.ts
import { PrismaClient } from '@prisma/client';
import { IGuildConfigRepository } from '../interfaces/IGuildConfigRepository';
import { GuildConfig } from '../types/GuildConfig';

export class PrismaGuildConfigRepository implements IGuildConfigRepository {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  async get(guildId: string): Promise<GuildConfig | null> {
    const record = await this.prisma.guildConfig.findUnique({
      where: { guildId }
    });
    
    if (!record) return null;
    return record.config as GuildConfig;
  }
  
  async save(config: GuildConfig): Promise<void> {
    await this.prisma.guildConfig.upsert({
      where: { guildId: config.guildId },
      create: {
        guildId: config.guildId,
        config: config as any
      },
      update: {
        config: config as any
      }
    });
  }
  
  // ... 他のメソッドも同様
}
```

**Step 3: DIコンテナで切り替え**

```typescript
// src/shared/container.ts
import { Container } from 'typedi';
import { IGuildConfigRepository } from './repositories/interfaces/IGuildConfigRepository';
import { KeyvGuildConfigRepository } from './repositories/implementations/KeyvGuildConfigRepository';
import { PrismaGuildConfigRepository } from './repositories/implementations/PrismaGuildConfigRepository';

// 環境変数で切り替え
const usePostgres = process.env.USE_POSTGRES === 'true';

if (usePostgres) {
  Container.set('GuildConfigRepository', new PrismaGuildConfigRepository());
} else {
  Container.set('GuildConfigRepository', new KeyvGuildConfigRepository(
    process.env.DATABASE_URL || 'sqlite://storage/db.sqlite'
  ));
}
```

**Step 4: データ移行スクリプト**

```typescript
// scripts/migrate-keyv-to-postgres.ts
import Keyv from 'keyv';
import { PrismaClient } from '@prisma/client';

async function migrate() {
  const keyv = new Keyv('sqlite://storage/db.sqlite', { namespace: 'guild_config' });
  const prisma = new PrismaClient();
  
  // Keyvからすべてのデータを取得
  const guildIds = []; // 既知のguildIDリスト
  
  for (const guildId of guildIds) {
    const config = await keyv.get(guildId);
    if (config) {
      await prisma.guildConfig.create({
        data: {
          guildId,
          config
        }
      });
      console.log(`Migrated config for guild ${guildId}`);
    }
  }
  
  await prisma.$disconnect();
  console.log('Migration completed!');
}

migrate();
```

---

## 具体的な移行タイムライン

### Week 1: Phase 1（緊急対応）
- [ ] Day 1: DBの再構築
- [ ] Day 1: KeyvsErrorリセット処理の削除
- [ ] Day 1-2: 動作確認とテスト

### Week 2-3: Phase 2（Repository導入）
- [ ] Day 1-2: 型定義とインターフェースの作成
- [ ] Day 3-4: KeyvGuildConfigRepositoryの実装
- [ ] Day 5-7: コマンド移行（cnfAfk, cnfVac, cnfProfChannel）
- [ ] Day 8-10: イベント移行（messageCreate, voiceStateUpdate, etc）
- [ ] Day 11-12: テストと検証
- [ ] Day 13-14: 古いdiscordBotKeyvs削除とクリーンアップ

### 将来（Phase 3）: PostgreSQL移行
- WebUI実装時またはスケールニーズ発生時に実施

---

## ロールバック計画

各Phaseでのロールバック手順:

### Phase 1のロールバック
```bash
# 古いDBに戻す
mv storage/db.sqlite storage/db.sqlite.new
mv storage/db.sqlite.corrupted storage/db.sqlite
```

### Phase 2のロールバック
- Gitで移行前のコミットに戻す
- `discordBotKeyvs`が残っているので機能は維持される

### Phase 3のロールバック
- 環境変数`USE_POSTGRES=false`に設定
- SQLite実装に自動切り替え

---

## チェックリスト

### Phase 1完了条件
- [ ] 新しいdb.sqliteが作成されている
- [ ] Botが起動して基本コマンドが動作する
- [ ] KeyvsErrorの自動リセットが削除されている
- [ ] エラーログが適切に記録されている

### Phase 2完了条件
- [ ] GuildConfig型定義が完成している
- [ ] IGuildConfigRepositoryインターフェースが定義されている
- [ ] KeyvGuildConfigRepositoryが実装されている
- [ ] すべてのコマンドがRepositoryを使用している
- [ ] すべてのイベントがRepositoryを使用している
- [ ] discordBotKeyvs.tsが削除されている
- [ ] テストが通る（または新規作成）
- [ ] 既存の全機能が動作する

### Phase 3完了条件
- [ ] Prisma schemaが定義されている
- [ ] PrismaGuildConfigRepositoryが実装されている
- [ ] データ移行スクリプトが完成している
- [ ] 本番環境でPostgreSQLが稼働している
- [ ] データ移行が完了している
- [ ] 全機能がPostgreSQLで動作している

---

## 推奨事項

1. **Phase 1を最優先で実施**: データ消失リスクを即座に排除
2. **Phase 2を2週間以内に完了**: 技術的負債を解消、将来の拡張性を確保
3. **Phase 3は必要になってから**: 現時点でPostgreSQLは過剰、WebUI実装時に検討

現在の優先度: **Phase 1 > Phase 2 >>> Phase 3**
