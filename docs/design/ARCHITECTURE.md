# アーキテクチャ設計書

## 概要

guild-mng-botを、Oracle Cloud Always Freeへの自動デプロイとWebUIでの設定管理が可能なアーキテクチャへリファクタリングします。

## 設計原則

1. **レイヤー分離**: Bot、Server、Sharedの3層構造
2. **データアクセスの抽象化**: リポジトリパターンで永続化層を抽象化
3. **型安全性**: TypeScriptの型システムを最大限活用
4. **拡張性**: WebUI実装やKubernetes移行を見据えた設計
5. **メンテナンス性**: 責務の明確化と疎結合

## ディレクトリ構造

```
guild-mng-bot/
├── src/
│   ├── bot/                          # Discord Bot層
│   │   ├── commands/                 # スラッシュコマンド
│   │   ├── events/                   # Discordイベントハンドラ
│   │   ├── services/                 # Bot固有サービス
│   │   └── index.ts                  # Bot起動エントリー
│   │
│   ├── server/                       # Webサーバー層
│   │   ├── routes/                   # ルーティング
│   │   │   ├── api/                  # REST API
│   │   │   │   ├── health.ts        # ヘルスチェック
│   │   │   │   ├── guilds.ts        # ギルド管理API（将来）
│   │   │   │   └── config.ts        # 設定管理API（将来）
│   │   │   └── index.ts
│   │   ├── middleware/               # ミドルウェア
│   │   │   ├── auth.ts               # 認証（将来）
│   │   │   ├── error.ts              # エラーハンドリング
│   │   │   └── validate.ts           # バリデーション（将来）
│   │   └── index.ts                  # サーバー起動エントリー
│   │
│   ├── shared/                       # 共通層
│   │   ├── config/                   # 設定管理
│   │   │   ├── index.ts              # 設定ロード
│   │   │   ├── schema.ts             # 設定スキーマ
│   │   │   └── env.ts                # 環境変数
│   │   ├── database/                 # データアクセス層
│   │   │   ├── client.ts             # DB接続
│   │   │   ├── repositories/         # リポジトリ
│   │   │   │   ├── base.repository.ts
│   │   │   │   ├── guild-config.repository.ts
│   │   │   │   └── index.ts
│   │   │   └── models/               # データモデル
│   │   │       ├── guild-config.model.ts
│   │   │       └── index.ts
│   │   ├── types/                    # 型定義
│   │   │   ├── config.ts             # 設定型
│   │   │   ├── discord.ts            # Discord拡張型
│   │   │   ├── api.ts                # API型（将来）
│   │   │   └── index.ts
│   │   ├── utils/                    # ユーティリティ
│   │   │   ├── logger.ts             # ロガー
│   │   │   ├── errors.ts             # カスタムエラー
│   │   │   └── index.ts
│   │   └── locale/                   # 国際化（Guild別言語対応）
│   │   │   ├── index.ts              # 言語取得ヘルパー
│   │   │   ├── ja.ts                 # 日本語カタログ
│   │   │   └── en.ts                 # 英語カタログ（将来）
│   │       ├── index.ts
│   │       └── ja.ts
│   │
│   └── index.ts                      # メインエントリーポイント
│
├── prisma/                           # Prisma ORM
│   ├── schema.prisma                 # DBスキーマ
│   └── migrations/                   # マイグレーション
│
├── scripts/                          # ユーティリティ
│   ├── migrate.ts                    # DBマイグレーション
│   └── seed.ts                       # 開発データ
│
├── .github/workflows/                # CI/CD
│   └── deploy.yml                    # 自動デプロイ
│
├── docker-compose.yml                # Docker Compose設定
├── Dockerfile                        # コンテナイメージ定義
└── docs/                             # ドキュメント
```

## アーキテクチャ図

```
┌─────────────────────────────────────────────┐
│            外部システム                       │
│  ┌──────────┐        ┌──────────────┐      │
│  │ Discord  │        │ WebUI        │      │
│  │ Gateway  │        │ (将来実装)    │      │
│  └─────┬────┘        └──────┬───────┘      │
└────────┼────────────────────┼──────────────┘
         │                    │
         │                    │ HTTP
    WebSocket                 │
         │                    │
┌────────┼────────────────────┼──────────────┐
│        ▼                    ▼              │
│  ┌──────────┐        ┌──────────────┐     │
│  │   Bot    │        │   Server     │     │
│  │  Layer   │        │   Layer      │     │
│  └─────┬────┘        └──────┬───────┘     │
│        │                    │              │
│        └─────────┬──────────┘              │
│                  │                         │
│                  ▼                         │
│          ┌───────────────┐                │
│          │  Shared Layer │                │
│          │               │                │
│          │ ┌───────────┐ │                │
│          │ │Repository │ │                │
│          │ └─────┬─────┘ │                │
│          └───────┼───────┘                │
└──────────────────┼────────────────────────┘
                   │
                   ▼
         ┌──────────────────┐
         │   Database       │
         │  (PostgreSQL)    │
         └──────────────────┘
```

## レイヤー詳細

### Bot Layer

**責務**: Discord特有のロジック

- スラッシュコマンドの実装
- Discordイベントのハンドリング
- Discord APIとの通信

**依存**: Shared Layer

**公開**: なし（内部使用のみ）

### Server Layer

**責務**: HTTP API提供

- RESTful APIエンドポイント
- 認証・認可
- WebUIの静的ファイル配信（将来）

**依存**: Shared Layer

**公開**: HTTP API

### Shared Layer

**責務**: 共通機能とビジネスロジック

- データアクセス抽象化（Repository）
- 設定管理
- 型定義
- ユーティリティ

**依存**: なし（最下層）

**公開**: Bot Layer、Server Layer

## データフロー

### Bot設定取得の例

```typescript
// 1. コマンドハンドラ（Bot Layer）
async execute(interaction) {
  const guildId = interaction.guildId;
  
  // 2. リポジトリ経由でデータ取得（Shared Layer）
  const config = await guildConfigRepository.getConfig(guildId);
  
  // 3. レスポンス
  await interaction.reply(`AFK Channel: ${config.afkVoiceChannelId}`);
}

// 4. リポジトリ（Shared Layer）
class GuildConfigRepository {
  async getConfig(guildId: string): Promise<GuildConfig> {
    // 5. DBアクセス
    const data = await prisma.guildConfig.findUnique({
      where: { guildId }
    });
    
    // 6. 型変換して返却
    return mapToGuildConfig(data);
  }
}
```

## データモデル設計

### Guild Config Model

```typescript
interface GuildConfig {
  guildId: string;
  locale: string; // 'ja' | 'en' - Guild別言語設定
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
  stickMessages: Array<{
    channelId: string;
    messageId: string;
  }>;
  leaveMemberLog: {
    channelId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## 技術スタック

### Bot Layer
- discord.js v14
- @hi18n/core（国際化）

### Server Layer
- Fastify（軽量・高速）
- @fastify/cors
- @fastify/helmet（セキュリティ）

### Shared Layer
- Prisma（ORM - 将来実装）
- Zod（バリデーション）
- Winston（ロギング）
- winston-daily-rotate-file（ログローテーション）

### インフラ
- PostgreSQL（データベース）
- Oracle Cloud Always Free（ホスティング）
- Docker + Docker Compose（コンテナ化）
- GitHub Actions（CI/CD）

## 環境変数設計

```env
# Discord設定
DISCORD_TOKEN=
DISCORD_APP_ID=

# データベース
DATABASE_URL=postgresql://...

# サーバー設定
PORT=3000
NODE_ENV=production

# ロギング
LOG_LEVEL=info

# 認証（将来）
JWT_SECRET=
DISCORD_CLIENT_SECRET=

# その他
LOCALE=ja
```

## セキュリティ設計

### 現フェーズ（Bot Only）
- Discord Token の安全な管理
- 環境変数での機密情報管理

### 将来フェーズ（WebUI追加時）
- Discord OAuth2認証
- JWT トークンベース認証
- CORS設定
- レート制限
- CSP（Content Security Policy）

## スケーラビリティ設計

### 現在の制約
- 単一インスタンス
- ステートレス（DB以外）

### 将来の拡張
- 水平スケーリング対応
- Redis セッション管理
- メッセージキュー（Bull/BullMQ）
- Kubernetes 対応

## エラーハンドリング設計

### エラー階層

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {}
}

class DatabaseError extends AppError {}
class ValidationError extends AppError {}
class NotFoundError extends AppError {}
class AuthorizationError extends AppError {}
```

### ログレベル

- **ERROR**: システムエラー、予期しない例外
- **WARN**: 設定不備、非推奨機能の使用
- **INFO**: 起動、シャットダウン、重要イベント
- **DEBUG**: 詳細なデバッグ情報（開発環境のみ）

## パフォーマンス要件

- Bot起動時間: 10秒以内
- コマンド応答時間: 3秒以内（Discord制限）
- API応答時間: 200ms以内（P95）
- メモリ使用量: 512MB以内

## 移行戦略

### Phase 1: 基盤構築（現在）
1. ディレクトリ構造作成
2. Shared Layer実装
3. 既存コードの移行

### Phase 2: Server実装
1. ヘルスチェックエンドポイント
2. Oracle Cloudデプロイ設定
3. CI/CD構築（GitHub Actions + SSH）

### Phase 3: WebUI準備
1. REST API実装
2. 認証機能
3. フロントエンド開発

### Phase 4: 本番移行
1. データマイグレーション
2. 段階的ロールアウト
3. モニタリング強化

## テスト戦略

### 単体テスト
- Repository層: モック使用
- Service層: Repository モック
- ユーティリティ関数

### 統合テスト
- API エンドポイント
- DB 接続

### E2Eテスト（将来）
- Bot コマンド実行
- WebUI操作フロー

## モニタリング設計

### ログ出力

**ハイブリッド方式（標準出力 + ファイル出力）**:

1. **標準出力**:
   - `docker logs` でリアルタイムモニタリング
   - JSON形式で構造化ログ
   - リクエストID追跡
   - Oracle Cloudのログモニタリングと統合可能

2. **ファイル出力（ローカルストレージ）**:
   - 詳細な調査・デバッグ用
   - 日付別ローテーション（14日保持）
   - エラーログ別ファイル
   - docker-compose volumeマウント（例: `./storage/logs:/app/logs`）
   - 長期保存・バックアップ可能

**ログレベル**:
- `error`: システムエラー、予期しない例外
- `warn`: 設定不備、非推奨機能の使用
- `info`: 起動、シャットダウン、重要イベント
- `debug`: 詳細なデバッグ情報（開発環境のみ）

### メトリクス（将来）
- コマンド実行回数
- API レスポンスタイム
- エラー率
- DB接続プール状態

## 国際化（i18n）設計

### Guild別言語対応

各ギルドが独立して言語を設定できるよう、`GuildConfig`に`locale`フィールドを含めます。

**実装方針**:
1. **GuildConfigにlocale保存**: デフォルト `'ja'`
2. **@hi18n/core使用**: 既存のi18nライブラリを継続利用
3. **動的言語切り替え**: コマンド実行時にGuildのlocaleを取得して表示

**使用例**:

```typescript
// src/shared/locale/index.ts
import { Book } from '@hi18n/core';
import catalogJa from './ja';
import catalogEn from './en';

export const localeBook = new Book({ ja: catalogJa, en: catalogEn });

export function getLocaleForGuild(guildId: string): string {
  // GuildConfigからlocaleを取得
  const config = await guildConfigRepository.findByGuildId(guildId);
  return config?.locale || 'ja'; // デフォルトは日本語
}

// Bot層での利用
const locale = await getLocaleForGuild(interaction.guildId);
const t = localeBook.t(locale);
await interaction.reply(t('success'));
```

**WebUIでの言語変更**:
- WebUI設定画面で言語ドロップダウンを表示
- `PUT /api/guilds/:guildId/config`で`locale`を更新
- Bot側は次回コマンド実行時に新しいlocaleを適用

**対応言語**:
- **Phase 1**: 日本語（ja）のみ
- **Phase 2**: 英語（en）追加（将来）
- **拡張**: 各言語カタログファイル追加で対応

## まとめ

このアーキテクチャは、現在のBot機能を維持しつつ、将来のWebUI実装やKubernetes移行を見据えた拡張可能な設計です。レイヤー分離により、各機能を独立して開発・テスト・デプロイできます。Guild別の言語設定により、多国籍サーバーでも柔軟に対応可能です。
