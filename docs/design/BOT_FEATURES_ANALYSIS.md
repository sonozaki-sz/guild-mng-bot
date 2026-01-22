# Bot機能分析とリファクタリング評価

## 実装されている機能一覧

### コマンド機能（13個）

#### 1. **echo** - シンプルなエコーコマンド
- **ファイル**: `src/commands/echo.ts`
- **機能**: 入力されたテキストをそのまま返す
- **複雑度**: ⭐ (非常にシンプル)
- **リファクタリング必要性**: ❌ なし
- **理由**: 18行のシンプルな実装、依存なし、問題なし

---

#### 2. **afk** - AFK自動移動
- **ファイル**: `src/commands/afk.ts`
- **機能**: 指定したユーザーをAFK VCに移動
- **依存**: `discordBotKeyvs.getDestAfkVcId()`
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: 
  - Keyvs依存あり → Repository移行必要
  - エラーハンドリングは比較的良好
  - ロジック自体は健全

**改善点**:
```typescript
// Before
const afkChannelId = await discordBotKeyvs.getDestAfkVcId(interaction.guildId!);

// After (Phase 2)
const repo = getGuildConfigRepository();
const config = await repo.get(interaction.guildId!);
const afkChannelId = config?.afk?.destVcId;
```

---

#### 3. **cnf-afk** - AFK設定
- **ファイル**: `src/commands/cnfAfk.ts`
- **機能**: AFK VCの設定・確認
  - `set-dest`: AFK移動先VC設定
  - `get-dest`: 現在の設定確認（テキスト表示）
  - `status`: ステータス表示（Embed）
- **依存**: `discordBotKeyvs` (set/get/delete)
- **複雑度**: ⭐⭐⭐ (やや複雑)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs依存、Repository移行対象

**Phase 2での変更計画**: 
- `get-dest`削除（`status`と機能重複）
- `status` → `show-setting`にリネーム
- 設定確認用の`getStatusEmbed()` → `getShowSettingEmbed()`にリネーム
- Repositoryパターン導入

---

#### 4. **cnf-vac** - VC自動作成設定
- **ファイル**: `src/commands/cnfVac.ts` (208行)
- **機能**: VC自動作成の設定
  - `start`: トリガーVC設定
  - `stop`: 機能停止
  - `status`: ステータス表示
- **依存**: `discordBotKeyvs` (vacTriggerVcIds, vacChannelIds)
- **複雑度**: ⭐⭐⭐⭐ (複雑)
- **リファクタリング必要性**: ✅✅ 強く推奨（Phase 2）
- **理由**:
  - 208行の長いファイル
  - 複数の設定値を管理
  - 削除されたチャンネルのクリーンアップロジックあり
  - Keyvs依存が多数

**Phase 2での変更計画**:
- `status` → `show-setting`にリネーム
- Repositoryパターン導入
- クリーンアップロジックをユーティリティ関数に分離
- 複雑な状態管理をドメインロジックに分離

---

#### 5. **cnf-vc** - VC管理（削除）
- **ファイル**: `src/commands/cnfVc.ts`
- **機能**: 自動作成されたVCの確認・削除
- **依存**: `discordBotKeyvs.getVacChannelIds()`
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs依存

---

#### 6. **cnf-prof-channel** - プロフィールチャンネル設定
- **ファイル**: `src/commands/cnfProfChannel.ts`
- **機能**: プロフィール表示用チャンネル設定
- **依存**: `discordBotKeyvs` (profChannelId)
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs依存

---

#### 7. **user-info** - ユーザー情報表示
- **ファイル**: `src/commands/userInfo.ts` (139行)
- **機能**: 
  - `normal`: 特定ユーザーの詳細情報
  - `vc-members`: VC参加者一覧
- **依存**: `discordBotKeyvs.getProfChannelId()`
- **複雑度**: ⭐⭐⭐ (やや複雑)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**:
  - プロフィール取得ロジックが複雑（メッセージ履歴を遡る）
  - Keyvs依存

**改善点**:
- プロフィール取得ロジックを別サービスに分離
- ページネーション処理の最適化

---

#### 8. **cnf-bump-reminder** - Bumpリマインダー設定
- **ファイル**: `src/commands/cnfBumpReminder.ts` (130行)
- **機能**:
  - `start`: リマインダー開始
  - `stop`: リマインダー停止
  - `set-mention`: メンションロール設定
  - `status`: ステータス表示
- **依存**: `discordBotKeyvs` (複数のbumpReminder設定)
- **複雑度**: ⭐⭐⭐ (やや複雑)
- **リファクタリング必要性**: ✅✅ 強く推奨（Phase 2）
- **理由**:
  - タイマー処理との連携
  - 複数の設定値管理
  - Keyvs依存

**Phase 2での変更計画**:
- `status` → `show-setting`にリネーム

---

#### 9. **send-text** - テキスト送信
- **ファイル**: `src/commands/sendText.ts`
- **機能**: 指定チャンネルにテキスト送信
- **複雑度**: ⭐ (シンプル)
- **リファクタリング必要性**: ❌ なし
- **理由**: Keyvs依存なし、シンプルな実装

---

#### 10. **play** - ゲーム機能
- **ファイル**: `src/commands/play.ts` (99行)
- **機能**: じゃんけんゲーム実装
  - `rps`: じゃんけん対戦
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ❌ なし
- **理由**: 
  - Keyvs依存なし
  - ゲームロジックは独立
  - 実装は健全

**注意点**: 将来的にゲームを追加する場合は別モジュールに分離推奨

---

#### 11. **status-list** - 設定一覧表示
- **ファイル**: `src/commands/statusList.ts` (29行)
- **機能**: 全設定のステータスを一覧表示
- **依存**: 各cnfコマンドの`getStatusEmbed()`
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅✅ 強く推奨（Phase 2で大幅改善）
- **理由**:
  - 現在: 各コマンドから個別にステータス取得
  - Phase 2: Repositoryパターンで統一的に取得可能に

**Phase 2での変更計画**:
- コマンド名: `status-list` → `show-settings`にリネーム
- ファイル名: `statusList.ts` → `showSettings.ts`
- 各コマンドの`getStatusEmbed()` → `getShowSettingEmbed()`に統一
- Repositoryパターンで全設定を1オブジェクトとして取得

**Phase 2実装後のイメージ**:
```typescript
const repo = getGuildConfigRepository();
const config = await repo.get(interaction.guildId!);

// 全設定が1つのオブジェクトに
const embed = formatConfigEmbed(config);
```

---

#### 12. **stick-message** - スティックメッセージ
- **ファイル**: 
  - `src/commands/stickMessage.ts` (240行)
  - `src/events/messageCreate.ts` (156行) - `executeStickMessage()`関数
- **機能**: 固定化しておきたいメッセージを常にチャンネル最下部に表示
  - `start`: 固定メッセージを設定（Modal入力）
  - `delete`: スティックメッセージ削除
  - `status`: 設定一覧表示
  - **自動再送信**: 対象チャンネルに新規メッセージ投稿時、スティックメッセージを削除→最下部に再送信（debounce 3秒）
  - **複数チャンネル対応**: Collection<string, string>で複数チャンネルに異なるメッセージ設定可能
- **依存**: `discordBotKeyvs` (stickMessageChannelIdMessageIdPairs)
- **複雑度**: ⭐⭐⭐⭐⭐ (最高)
- **リファクタリング必要性**: ✅✅✅ 最優先（Phase 2）
- **理由**:
  - **最も複雑な機能**: コマンド(240行) + イベントハンドラ連携
  - **Collection<string, string>管理**: チャンネルID→メッセージIDのペア
  - **debounce処理**: 連続投稿時の負荷軽減（3秒間隔）
  - **Modal UI**: テンプレート入力用のモーダルダイアログ
  - **エラーハンドリング**: メッセージ削除失敗、チャンネル削除時の整合性維持
  - **自動クリーンアップ**: 存在しないチャンネル/メッセージの自動削除（refreshStickMessage）

**Phase 2での変更計画**:
- `status` → `show-setting`にリネーム
- **Service層分離**: `StickMessageService`クラスの導入
- Repositoryパターンで`Record<string, string>`として保存
- debounce処理の維持（lodashまたはカスタム実装）
- messageCreate.tsとの疎結合化

**実装の複雑さ**:
```typescript
// messageCreate.tsでのイベント処理
const debouncedExecuteStickMessage = debounce(executeStickMessage, 3_000);

// 処理フロー:
// 1. 新メッセージ投稿検知
// 2. 既存スティックメッセージを削除
// 3. 同じ内容を最下部に再送信
// 4. 新しいメッセージIDをDBに保存
```

---

#### 13. **leave-member-log** - 退出ログ
- **ファイル**: `src/commands/leaveMemberLog.ts`
- **機能**: メンバー退出時のログチャンネル設定
  - `set`: ログチャンネル設定
  - `unset`: 解除
  - `status`: ステータス表示
- **依存**: `discordBotKeyvs` (leaveMemberLogChannelId)
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs依存

**Phase 2での変更計画**:
- `status` → `show-setting`にリネーム

---

### イベントハンドラ（9個）

#### 1. **ready** - Bot起動時
- **ファイル**: `src/events/ready.ts`
- **機能**: 
  - アクティビティ設定
  - 全GuildのKeyv namespace初期化
- **複雑度**: ⭐ (シンプル)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs初期化処理 → Repository初期化に変更

---

#### 2. **guildCreate** - Guild参加時
- **ファイル**: `src/events/guildCreate.ts`
- **機能**: Keyv namespace作成
- **複雑度**: ⭐ (シンプル)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs初期化 → Repository移行

---

#### 3. **guildDelete** - Guild退出時
- **ファイル**: `src/events/guildDelete.ts`
- **機能**: Keyv namespace削除
- **依存**: `discordBotKeyvs.keyvs.deletekeyv()`
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: 
  - KeyvsErrorのリセット処理あり（問題）
  - Repository移行で改善

---

#### 4. **channelDelete** - チャンネル削除時
- **ファイル**: `src/events/channelDelete.ts`
- **機能**: VC自動作成のトリガーリストから削除
- **依存**: `discordBotKeyvs` (vacTriggerVcIds)
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs依存

---

#### 5. **messageCreate** - メッセージ作成時
- **ファイル**: `src/events/messageCreate.ts` (156行)
- **機能**:
  - **Bumpリマインダー**: Disboard bumpコマンド検出と通知
  - **スティックメッセージ**: メッセージを最上部に維持
- **依存**: `discordBotKeyvs` (複数)
- **複雑度**: ⭐⭐⭐⭐⭐ (非常に複雑)
- **リファクタリング必要性**: ✅✅✅ 最優先（Phase 2）
- **理由**:
  - 156行の長いファイル
  - **setInterval使用** → メモリリーク・タイマー消失の問題
  - KeyvsErrorのリセット処理あり（データ消失リスク）
  - **2つの独立した複雑な機能が混在**: Bumpリマインダー + スティックメッセージ
  - **debounce処理**: スティックメッセージ用（3秒）

**重大な問題**:
```typescript
// Bumpリマインダー: setIntervalでポーリング
const timerId = setInterval(async () => {
  const rmdBumpDate = await discordBotKeyvs.getBumpReminderRemindDate(message.guildId!);
  if (!rmdBumpDate) return;
  if (rmdBumpDate <= Date.now()) {
    clearInterval(timerId);
    // リマインド処理
  }
}, 60_000); // 1分ごとにポーリング

// スティックメッセージ: debounceで3秒待機後に再送信
const debouncedExecuteStickMessage = debounce(executeStickMessage, 3_000);
```
→ **Bot再起動時にBumpリマインダーのタイマーが消失**
→ **Phase 2でnode-cronに移行必須**

**改善点**:
- Bumpリマインダーをサービス層に分離（BumpReminderService）
- スティックメッセージをサービス層に分離（StickMessageService）
- setInterval → node-cronスケジューラに移行
- debounce処理の維持（StickMessageService内）
- Repositoryパターン導入

---

#### 6. **voiceStateUpdate** - VC状態変更時
- **ファイル**: `src/events/voiceStateUpdate.ts` (70行)
- **機能**: VC自動作成・削除
  - トリガーVC入室時に新VCを作成
  - 全員退出時にVCを削除
- **依存**: `discordBotKeyvs` (vacTriggerVcIds, vacChannelIds)
- **複雑度**: ⭐⭐⭐ (やや複雑)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**:
  - Keyvs依存
  - KeyvsErrorのリセット処理あり
  - ロジックは比較的健全

**改善点**:
- Repositoryパターン導入
- エラーハンドリング改善

---

#### 7. **guildMemberRemove** - メンバー退出時
- **ファイル**: `src/events/guildMemberRemove.ts`
- **機能**: 退出ログを指定チャンネルに送信
- **依存**: `discordBotKeyvs.getLeaveMemberLogChannelId()`
- **複雑度**: ⭐⭐ (中程度)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**: Keyvs依存

---

#### 8. **InteractionCreate** - インタラクション処理
- **ファイル**: `src/events/InteractionCreate.ts`
- **機能**: コマンド実行とエラーハンドリング
- **複雑度**: ⭐⭐⭐ (やや複雑)
- **リファクタリング必要性**: ✅ 必要（Phase 2）
- **理由**:
  - KeyvsErrorのリセット処理あり
  - エラーハンドリング統一が必要

---

## リファクタリング優先度マトリクス

| 機能 | 複雑度 | Keyvs依存 | タイマー/debounce | 優先度 | Phase |
|------|--------|-----------|----------|--------|-------|
| **messageCreate (Bump)** | ⭐⭐⭐⭐⭐ | ✅ | ✅ setInterval + debounce | 🔴 最優先 | Phase 2 |
| **stick-message** | ⭐⭐⭐⭐⭐ | ✅ | ✅ debounce | 🔴 最優先 | Phase 2 |
| **cnf-vac** | ⭐⭐⭐⭐ | ✅ | ❌ | 🔴 高 | Phase 2 |
| **voiceStateUpdate** | ⭐⭐⭐ | ✅ | ❌ | 🟡 中 | Phase 2 |
| **user-info** | ⭐⭐⭐ | ✅ | ❌ | 🟡 中 | Phase 2 |
| **cnf-bump-reminder** | ⭐⭐⭐ | ✅ | ❌ | 🟡 中 | Phase 2 |
| **status-list** | ⭐⭐ | ✅ | ❌ | 🟢 低 | Phase 2 |
| 他のcnfコマンド | ⭐⭐ | ✅ | ❌ | 🟢 低 | Phase 2 |
| **play** | ⭐⭐ | ❌ | ❌ | ⚪ なし | - |
| **echo** | ⭐ | ❌ | ❌ | ⚪ なし | - |
| **send-text** | ⭐ | ❌ | ❌ | ⚪ なし | - |

---

## リファクタリング戦略

### 🔴 Phase 2.1: 緊急対応（最優先）

1. **messageCreate.ts のタイマー処理**
   - setInterval → node-cronスケジューラに移行
   - DB保存されたremindDateから復元可能に
   - Bot再起動耐性を確保

2. **KeyvsError自動リセットの削除**
   - 全イベントハンドラから削除
   - エラーログ + アラート通知に変更

### 🔴 Phase 2.2: Repositoryパターン導入

**順序**:
1. GuildConfigRepository実装
2. シンプルなコマンドから移行（cnfAfk, cnfProfChannel）
3. 複雑なコマンドを移行（**stick-message最優先** → cnfVac）
4. イベントハンドラを移行
5. status-listを新実装に置き換え（最大の恩恵、コマンド名もshow-settingsにリネーム）

**stick-message の特別対応**:
- Service層分離: `StickMessageService.ts`
- debounce処理の維持（lodashまたはカスタム実装）
- messageCreate.tsとの疎結合化
- 推定: 6-8時間（最も複雑）

### 🟡 Phase 2.3: サービス層の分離

複雑なロジックをサービス層に分離:

```
src/
  bot/
    services/
      BumpReminderService.ts       # Bumpリマインダーロジック + node-cron
      StickMessageService.ts       # スティックメッセージロジック + debounce
      VcAutoCreationService.ts     # VC自動作成ロジック
      ProfileService.ts            # プロフィール取得ロジック
```

### ⚪ リファクタリング不要な機能

- echo, send-text, play: 依存なし、シンプル、問題なし

---

## 見積もり時間

| タスク | 詳細 | 時間 |
|--------|------|------|
| Phase 2.1 (緊急) | DB再構築 + KeyvsError削除 | 2-3時間 |
| Phase 2.2 (Repository) | 型定義 + 実装 + コマンド移行 + イベント移行 | 14-18時間 |
| Phase 2.3 (サービス分離) | BumpReminder/StickMessage/VcAutoCreation Service | 8-12時間 |
| **合計** | | **24-33時間** |

**内訳 (Phase 2.2)**:
- 型定義・インターフェース: 2時間
- Repository実装: 2時間
- シンプルなコマンド(8件): 4-6時間
- **stick-message**: 6-8時間（最複雑）
- cnf-vac: 4-6時間
- イベントハンドラ(8件): 4-6時間

---

## 結論

### ✅ リファクタリングが必要な機能
- **コマンド**: 10個（echo, send-text, play除く）
- **イベント**: 8個（すべて）

### 🎯 最重要改善点
1. **messageCreate.ts のsetInterval問題** → node-cron移行
2. **KeyvsError自動リセット** → 削除
3. **Repositoryパターン導入** → 型安全・保守性向上

### 📊 改善効果
- コード削減: 141行（discordBotKeyvs.ts）→ 約50行
- 型安全性: any型 → 厳密な型定義
- テスト可能性: 困難 → モック容易
- 保守性: 分散 → 集約

**推奨**: Phase 2を最優先で実施し、タイマー問題とKeyvs依存を一気に解決する。
