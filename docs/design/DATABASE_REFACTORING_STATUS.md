# データベースリファクタリング - 現状と計画

## 最終更新: 2026-01-23

## 1. 現状のデータ構造分析

### 1.1 Keyv使用状況
全体で**18ファイル**でKeyvを使用:
- **コアファイル**: 2ファイル
  - `src/services/keyvs.ts` (59行) - Keyv wrapperクラス
  - `src/services/discordBotKeyvs.ts` (141行) - データアクセス層、42個のCRUDメソッド
- **イベントハンドラ**: 8ファイル
  - ready.ts, guildCreate.ts, guildDelete.ts, channelDelete.ts
  - voiceStateUpdate.ts, guildMemberRemove.ts, messageCreate.ts, InteractionCreate.ts
- **コマンドハンドラ**: 8ファイル
  - afk.ts, cnfAfk.ts, cnfBumpReminder.ts, cnfProfChannel.ts
  - cnfVac.ts, cnfVc.ts, leaveMemberLog.ts, stickMessage.ts, userInfo.ts

### 1.2 現在のKeyv設計の問題点

#### キー構造
```
パターン: "guildId:category/field"
例: "955749995808702494:vcAutoCreation/channelIds"
```

#### データ構造
```json
{
  "value": {実際のデータ},
  "expires": null
}
```

#### 問題点
1. **二重JSON包装**: `{"value":...,"expires":null}`でオーバーヘッド
2. **型安全性の欠如**: `as string | undefined`での手動キャスト
3. **複合文字列キー**: リレーショナル制約なし
4. **42個の冗長メソッド**: 14設定 × 3操作(get/set/delete)
5. **テスト困難**: モック化が複雑
6. **エラーハンドリング**: KeyvsError → setkeyv()リセットパターン

### 1.3 現在のデータ内容 (12KB db.sqlite)

**Guild ID: 955749995808702494**

```
vcAutoCreation:
  - channelIds: [4チャンネル]
  - categoryId: 設定済み
  - templateVcId: 設定済み

bumpReminder:
  - enabled: true
  - remindDate: ISO日時文字列
  - mentions: ロールID配列

その他:
  - destAfkVcId: VC ID
  - leaveMemberLog: 有効/無効
  - stickMessage: メッセージ設定
```

## 2. 提案: リレーショナルスキーマ設計

### 2.1 テーブル構造

```sql
-- ギルド設定マスタ
CREATE TABLE guild_configs (
  guild_id TEXT PRIMARY KEY,
  dest_afk_vc_id TEXT,
  leave_member_log_enabled BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- VC自動作成設定
CREATE TABLE vc_auto_creation (
  guild_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  template_vc_id TEXT NOT NULL,
  FOREIGN KEY (guild_id) REFERENCES guild_configs(guild_id) ON DELETE CASCADE
);

-- VC自動作成チャンネル
CREATE TABLE vc_auto_creation_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  FOREIGN KEY (guild_id) REFERENCES vc_auto_creation(guild_id) ON DELETE CASCADE,
  UNIQUE(guild_id, channel_id)
);

-- Bumpリマインダー
CREATE TABLE bump_reminders (
  guild_id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT 1,
  remind_date TEXT,
  FOREIGN KEY (guild_id) REFERENCES guild_configs(guild_id) ON DELETE CASCADE
);

-- Bumpリマインダーメンション
CREATE TABLE bump_reminder_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  FOREIGN KEY (guild_id) REFERENCES bump_reminders(guild_id) ON DELETE CASCADE,
  UNIQUE(guild_id, role_id)
);

-- 固定メッセージ
CREATE TABLE stick_messages (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  FOREIGN KEY (guild_id) REFERENCES guild_configs(guild_id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_vc_channels_guild ON vc_auto_creation_channels(guild_id);
CREATE INDEX idx_bump_mentions_guild ON bump_reminder_mentions(guild_id);
```

### 2.2 TypeScriptインターフェース

```typescript
interface GuildConfig {
  guildId: string;
  destAfkVcId?: string;
  leaveMemberLogEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VcAutoCreation {
  guildId: string;
  categoryId: string;
  templateVcId: string;
  channelIds: string[];
}

interface BumpReminder {
  guildId: string;
  enabled: boolean;
  remindDate?: Date;
  mentions: string[];
}

interface StickMessage {
  guildId: string;
  channelId: string;
  messageId: string;
}
```

## 3. リポジトリパターン実装

### 3.1 インターフェース設計

```typescript
interface IGuildConfigRepository {
  findByGuildId(guildId: string): Promise<GuildConfig | null>;
  save(config: GuildConfig): Promise<void>;
  delete(guildId: string): Promise<void>;
}

interface IVcAutoCreationRepository {
  findByGuildId(guildId: string): Promise<VcAutoCreation | null>;
  save(guildId: string, config: VcAutoCreation): Promise<void>;
  delete(guildId: string): Promise<void>;
}

interface IBumpReminderRepository {
  findByGuildId(guildId: string): Promise<BumpReminder | null>;
  save(guildId: string, reminder: BumpReminder): Promise<void>;
  delete(guildId: string): Promise<void>;
}

interface IStickMessageRepository {
  findByGuildId(guildId: string): Promise<StickMessage | null>;
  save(guildId: string, message: StickMessage): Promise<void>;
  delete(guildId: string): Promise<void>;
}
```

### 3.2 better-sqlite3実装

```typescript
import Database from 'better-sqlite3';

class GuildConfigRepository implements IGuildConfigRepository {
  constructor(private db: Database.Database) {}

  async findByGuildId(guildId: string): Promise<GuildConfig | null> {
    const row = this.db.prepare(
      'SELECT * FROM guild_configs WHERE guild_id = ?'
    ).get(guildId);
    return row ? this.mapToEntity(row) : null;
  }

  async save(config: GuildConfig): Promise<void> {
    this.db.prepare(`
      INSERT INTO guild_configs (guild_id, dest_afk_vc_id, leave_member_log_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        dest_afk_vc_id = excluded.dest_afk_vc_id,
        leave_member_log_enabled = excluded.leave_member_log_enabled,
        updated_at = excluded.updated_at
    `).run(
      config.guildId,
      config.destAfkVcId,
      config.leaveMemberLogEnabled ? 1 : 0,
      config.createdAt.toISOString(),
      config.updatedAt.toISOString()
    );
  }

  async delete(guildId: string): Promise<void> {
    this.db.prepare('DELETE FROM guild_configs WHERE guild_id = ?').run(guildId);
  }

  private mapToEntity(row: any): GuildConfig {
    return {
      guildId: row.guild_id,
      destAfkVcId: row.dest_afk_vc_id,
      leaveMemberLogEnabled: Boolean(row.leave_member_log_enabled),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
```

## 4. マイグレーション計画

### 4.1 移行スクリプト

```typescript
// src/scripts/migrate-keyv-to-relational.ts
import Keyv from 'keyv';
import Database from 'better-sqlite3';

async function migrateKeyvToRelational() {
  const oldDb = new Keyv('sqlite://storage/db.sqlite');
  const newDb = new Database('storage/db-new.sqlite');
  
  // スキーマ作成
  newDb.exec(/* CREATE TABLE文 */);
  
  // 全ギルドID取得
  const guildIds = await getAllGuildIds(oldDb);
  
  for (const guildId of guildIds) {
    // guild_configs
    const destAfkVcId = await oldDb.get(`${guildId}:destAfkVcId`);
    const leaveMemberLog = await oldDb.get(`${guildId}:leaveMemberLog`);
    newDb.prepare(/* INSERT guild_configs */).run(/* ... */);
    
    // vc_auto_creation
    const vcConfig = await oldDb.get(`${guildId}:vcAutoCreation/config`);
    if (vcConfig?.value) {
      newDb.prepare(/* INSERT vc_auto_creation */).run(/* ... */);
      
      const channelIds = await oldDb.get(`${guildId}:vcAutoCreation/channelIds`);
      for (const channelId of channelIds?.value || []) {
        newDb.prepare(/* INSERT vc_auto_creation_channels */).run(/* ... */);
      }
    }
    
    // bump_reminders
    const bumpConfig = await oldDb.get(`${guildId}:bumpReminder/config`);
    if (bumpConfig?.value) {
      newDb.prepare(/* INSERT bump_reminders */).run(/* ... */);
      
      const mentions = await oldDb.get(`${guildId}:bumpReminder/mentions`);
      for (const roleId of mentions?.value || []) {
        newDb.prepare(/* INSERT bump_reminder_mentions */).run(/* ... */);
      }
    }
    
    // stick_messages
    const stickMsg = await oldDb.get(`${guildId}:stickMessage/message`);
    if (stickMsg?.value) {
      newDb.prepare(/* INSERT stick_messages */).run(/* ... */);
    }
  }
  
  console.log('Migration completed!');
}
```

### 4.2 移行手順

1. **バックアップ作成**
   ```bash
   cp storage/db.sqlite storage/db.sqlite.backup
   ```

2. **移行スクリプト実行**
   ```bash
   pnpm tsx src/scripts/migrate-keyv-to-relational.ts
   ```

3. **データ検証**
   ```bash
   sqlite3 storage/db-new.sqlite "SELECT * FROM guild_configs;"
   ```

4. **新スキーマへ切り替え**
   ```bash
   mv storage/db.sqlite storage/db-keyv-old.sqlite
   mv storage/db-new.sqlite storage/db.sqlite
   ```

## 5. コード移行計画

### 5.1 変更対象ファイル (18ファイル)

**Phase 2-1: コアサービス**
- [ ] `src/services/keyvs.ts` → 削除
- [ ] `src/services/discordBotKeyvs.ts` → `src/repositories/` に置き換え
- [ ] `src/services/database.ts` → 新規作成 (better-sqlite3初期化)

**Phase 2-2: イベントハンドラ (8ファイル)**
- [ ] `src/events/ready.ts`
- [ ] `src/events/guildCreate.ts`
- [ ] `src/events/guildDelete.ts`
- [ ] `src/events/channelDelete.ts`
- [ ] `src/events/voiceStateUpdate.ts`
- [ ] `src/events/guildMemberRemove.ts`
- [ ] `src/events/messageCreate.ts`
- [ ] `src/events/InteractionCreate.ts`

**Phase 2-3: コマンドハンドラ (8ファイル)**
- [ ] `src/commands/afk.ts`
- [ ] `src/commands/cnfAfk.ts`
- [ ] `src/commands/cnfBumpReminder.ts`
- [ ] `src/commands/cnfProfChannel.ts`
- [ ] `src/commands/cnfVac.ts`
- [ ] `src/commands/cnfVc.ts`
- [ ] `src/commands/leaveMemberLog.ts`
- [ ] `src/commands/stickMessage.ts`
- [ ] `src/commands/userInfo.ts`

### 5.2 変更パターン例

**Before (Keyv)**
```typescript
const channelIds = await discordBotKeyvs.getVcAutoCreationChannelIds(guildId);
if (!channelIds) {
  await discordBotKeyvs.setVcAutoCreationChannelIds(guildId, []);
}
```

**After (Repository)**
```typescript
const vcConfig = await vcAutoCreationRepo.findByGuildId(guildId);
if (!vcConfig) {
  await vcAutoCreationRepo.save(guildId, {
    guildId,
    categoryId: '',
    templateVcId: '',
    channelIds: []
  });
}
```

## 6. タイマー処理改善 (Phase 2で同時実施)

### 6.1 現在の問題
```typescript
// src/events/ready.ts
setInterval(async () => {
  // 10秒ごとにポーリング → メモリリーク懸念
}, 10000);
```

### 6.2 改善案: node-cron

```typescript
import cron from 'node-cron';

// 1分ごとにチェック
cron.schedule('* * * * *', async () => {
  const guilds = await guildConfigRepo.findAll();
  for (const guild of guilds) {
    const reminder = await bumpReminderRepo.findByGuildId(guild.guildId);
    if (reminder?.enabled && reminder.remindDate) {
      if (new Date() >= reminder.remindDate) {
        // リマインダー送信
      }
    }
  }
});
```

## 7. ArgoCD環境からのデータ移行

### 7.1 現状
- **管理者**: 別の人がArgoCD管理、WebUIアクセスのみ
- **ファイルサイズ**: 12KB (db.sqlite)
- **移行方法**: base64エンコード経由で確認済み

### 7.2 移行手順

**ArgoCD Pod → Local**
```bash
# ArgoCD WebUI Terminal で実行
cat storage/db.sqlite | base64 > db.sqlite.base64

# ローカルで実行
base64 -d db.sqlite.base64 > db.sqlite
```

**Local → Oracle Cloud**
```bash
scp db.sqlite oracle-cloud:/opt/guild-mng-bot/storage/
```

## 8. 実装スケジュール

### Phase 2: データ構造とタイマー改善 (2週間)

**Week 1**
- [ ] Day 1-2: スキーマ設計最終化、TypeScript型定義
- [ ] Day 3-4: リポジトリパターン実装 (4リポジトリ)
- [ ] Day 5-7: マイグレーションスクリプト実装＆テスト

**Week 2**
- [ ] Day 8-10: イベントハンドラ移行 (8ファイル)
- [ ] Day 11-13: コマンドハンドラ移行 (8ファイル)
- [ ] Day 14: node-cron統合、統合テスト

### 依存関係
```
Phase 1 (基盤構築) 完了
  ↓
Phase 2 (データ構造 + Repository + タイマー) ← 現在ここ
  ↓
Phase 5 (データ永続化検証)
  ↓
Phase 6 (デプロイ準備)
```

## 9. テスト戦略

### 9.1 ユニットテスト
```typescript
// tests/repositories/guildConfig.test.ts
import { GuildConfigRepository } from '@/repositories/guildConfig';
import Database from 'better-sqlite3';

describe('GuildConfigRepository', () => {
  let db: Database.Database;
  let repo: GuildConfigRepository;
  
  beforeEach(() => {
    db = new Database(':memory:');
    // スキーマ作成
    repo = new GuildConfigRepository(db);
  });
  
  it('should save and retrieve guild config', async () => {
    const config = {
      guildId: '123',
      destAfkVcId: '456',
      leaveMemberLogEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await repo.save(config);
    const result = await repo.findByGuildId('123');
    
    expect(result).toEqual(config);
  });
});
```

### 9.2 移行検証
```bash
# 移行前データ件数
sqlite3 storage/db.sqlite "SELECT COUNT(*) FROM keyv;"

# 移行後データ検証
sqlite3 storage/db-new.sqlite "SELECT COUNT(*) FROM guild_configs;"
sqlite3 storage/db-new.sqlite "SELECT COUNT(*) FROM vc_auto_creation_channels;"
```

## 10. ロールバック計画

### 10.1 失敗時の対応
```bash
# 1. 新スキーマDBを退避
mv storage/db.sqlite storage/db-new-failed.sqlite

# 2. 旧KeyvDBを復元
cp storage/db.sqlite.backup storage/db.sqlite

# 3. アプリケーション再起動
docker-compose restart
```

### 10.2 段階的移行オプション
- オプション1: 読み取りは新DB、書き込みは両方 (一時的二重書き込み)
- オプション2: ギルド単位で段階的移行 (テストギルドから開始)

## 11. 次のアクション

### 今すぐ実施
1. [ ] スキーマ設計レビュー (このドキュメント)
2. [ ] TypeScript型定義ファイル作成
3. [ ] better-sqlite3依存関係追加

### Phase 2開始時
1. [ ] `src/repositories/` ディレクトリ作成
2. [ ] 4リポジトリ実装 (GuildConfig, VcAutoCreation, BumpReminder, StickMessage)
3. [ ] マイグレーションスクリプト実装
4. [ ] ArgoCD環境からdb.sqlite取得

## 12. 参考情報

### パッケージバージョン
- 現在: `keyv@4.5.4`, `@keyv/sqlite@3.6.7`
- 移行先: `better-sqlite3@^11.0.0`
- タイマー: `node-cron@^3.0.0`

### 関連ドキュメント
- [REFACTORING_PLAN.md](./REFACTORING_PLAN.md) - 全体の8フェーズ計画
- [CURRENT_ISSUES.md](./CURRENT_ISSUES.md) - 17個の既存問題分析
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Oracle Cloudデプロイ手順
- [ARCHITECTURE.md](./ARCHITECTURE.md) - アーキテクチャ設計

---

**最後の更新内容**: Keyv使用箇所の完全な洗い出し完了、リレーショナルスキーマ設計提案、リポジトリパターン実装計画策定
