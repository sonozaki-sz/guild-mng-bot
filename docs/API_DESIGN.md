# Web API設計書（将来実装用）

## 概要

WebUIでBot設定を管理するためのREST API設計です。現時点では実装せず、Phase 8で実装します。

## 認証設計

### Discord OAuth2フロー

```
1. ユーザー → /auth/login (リダイレクト)
2. Discord認証画面
3. コールバック → /auth/callback?code=xxx
4. JWTトークン発行
5. 以降のリクエストでJWTを使用
```

### エンドポイント

#### `GET /auth/login`

Discord OAuth2認証を開始

**レスポンス**: Discord認証ページへリダイレクト

---

#### `GET /auth/callback`

Discord OAuth2コールバック

**クエリパラメータ**:
- `code`: string - Discord認証コード

**レスポンス**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "123456789",
    "username": "User",
    "discriminator": "0001",
    "avatar": "hash"
  }
}
```

---

#### `GET /auth/me`

現在ログイン中のユーザー情報取得

**ヘッダー**:
- `Authorization: Bearer <token>`

**レスポンス**:
```json
{
  "id": "123456789",
  "username": "User",
  "guilds": [
    {
      "id": "guild-id-1",
      "name": "My Server",
      "icon": "hash",
      "owner": true,
      "permissions": "8"
    }
  ]
}
```

---

## ギルド管理API

### `GET /api/guilds`

ユーザーが管理権限を持つギルド一覧

**ヘッダー**:
- `Authorization: Bearer <token>`

**クエリパラメータ**:
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)

**レスポンス**:
```json
{
  "guilds": [
    {
      "id": "guild-id-1",
      "name": "My Server",
      "icon": "https://cdn.discordapp.com/icons/...",
      "memberCount": 1234,
      "hasBot": true,
      "configuredAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

---

### `GET /api/guilds/:guildId`

ギルド詳細情報取得

**パラメータ**:
- `guildId`: string - ギルドID

**ヘッダー**:
- `Authorization: Bearer <token>`

**レスポンス**:
```json
{
  "id": "guild-id-1",
  "name": "My Server",
  "icon": "https://cdn.discordapp.com/icons/...",
  "memberCount": 1234,
  "channels": [
    {
      "id": "channel-1",
      "name": "general",
      "type": "GUILD_TEXT"
    },
    {
      "id": "vc-1",
      "name": "Voice 1",
      "type": "GUILD_VOICE"
    }
  ],
  "roles": [
    {
      "id": "role-1",
      "name": "@everyone",
      "color": 0
    }
  ]
}
```

---

## Bot設定API

### `GET /api/guilds/:guildId/config`

ギルドのBot設定取得

**パラメータ**:
- `guildId`: string - ギルドID

**ヘッダー**:
- `Authorization: Bearer <token>`

**レスポンス**:
```json
{
  "guildId": "guild-id-1",
  "afk": {
    "enabled": true,
    "voiceChannelId": "vc-afk"
  },
  "profile": {
    "channelId": "text-prof"
  },
  "voiceAutoCreate": {
    "enabled": true,
    "triggerChannelIds": ["vc-trigger-1"],
    "createdChannelIds": ["vc-auto-1", "vc-auto-2"]
  },
  "bumpReminder": {
    "enabled": true,
    "mentionRoleId": "role-notify",
    "mentionUserIds": ["user-1"],
    "lastBumpAt": "2026-01-22T10:00:00Z",
    "nextRemindAt": "2026-01-22T12:00:00Z"
  },
  "stickMessages": [
    {
      "channelId": "text-rules",
      "messageId": "msg-1"
    }
  ],
  "leaveMemberLog": {
    "enabled": true,
    "channelId": "text-logs"
  },
  "updatedAt": "2026-01-22T10:00:00Z"
}
```

---

### `PUT /api/guilds/:guildId/config`

ギルドのBot設定更新

**パラメータ**:
- `guildId`: string - ギルドID

**ヘッダー**:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**リクエストボディ**:
```json
{
  "afk": {
    "enabled": true,
    "voiceChannelId": "vc-afk"
  },
  "bumpReminder": {
    "enabled": false
  }
}
```

**レスポンス**:
```json
{
  "guildId": "guild-id-1",
  "afk": {
    "enabled": true,
    "voiceChannelId": "vc-afk"
  },
  "bumpReminder": {
    "enabled": false
  },
  "updatedAt": "2026-01-22T11:00:00Z"
}
```

---

### `PATCH /api/guilds/:guildId/config/afk`

AFK設定の部分更新

**パラメータ**:
- `guildId`: string - ギルドID

**リクエストボディ**:
```json
{
  "enabled": true,
  "voiceChannelId": "vc-afk"
}
```

**レスポンス**: 200 OK

---

### `DELETE /api/guilds/:guildId/config`

ギルドの設定を全削除（リセット）

**パラメータ**:
- `guildId`: string - ギルドID

**レスポンス**: 204 No Content

---

## 統計・ログAPI

### `GET /api/guilds/:guildId/stats`

ギルドの統計情報

**レスポンス**:
```json
{
  "commandUsage": {
    "total": 1234,
    "byCommand": {
      "afk": 100,
      "userinfo": 50
    }
  },
  "activeUsers": 567,
  "messagesProcessed": 10000
}
```

---

### `GET /api/guilds/:guildId/logs`

ギルドのBotログ取得

**クエリパラメータ**:
- `level`: string - ログレベル（error, warn, info）
- `from`: ISO8601 date
- `to`: ISO8601 date
- `limit`: number (default: 100)

**レスポンス**:
```json
{
  "logs": [
    {
      "timestamp": "2026-01-22T10:00:00Z",
      "level": "info",
      "message": "User joined voice channel",
      "metadata": {
        "userId": "user-1",
        "channelId": "vc-1"
      }
    }
  ]
}
```

---

## エラーレスポンス

全エンドポイントで統一されたエラー形式

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "details": {}
  }
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `UNAUTHORIZED` | 401 | 認証エラー |
| `FORBIDDEN` | 403 | 権限不足 |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `VALIDATION_ERROR` | 400 | リクエストデータが不正 |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `INTERNAL_ERROR` | 500 | サーバーエラー |
| `BOT_NOT_IN_GUILD` | 400 | Botがギルドにいない |
| `INSUFFICIENT_PERMISSIONS` | 403 | Discord権限不足 |

---

## レート制限

### 制限

- 認証済みリクエスト: 100 req/min
- 未認証リクエスト: 10 req/min
- 設定更新: 20 req/min

### ヘッダー

レスポンスに以下のヘッダーを含める：

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642857600
```

---

## WebSocket API（将来検討）

リアルタイム更新用WebSocket接続

### `WS /api/guilds/:guildId/events`

**接続時**:
```json
{
  "type": "auth",
  "token": "jwt-token"
}
```

**受信イベント**:
```json
{
  "type": "config_updated",
  "data": {
    "field": "afk.voiceChannelId",
    "value": "new-channel-id",
    "updatedBy": "user-id",
    "timestamp": "2026-01-22T10:00:00Z"
  }
}
```

---

## 実装優先順位

### Phase 1（最優先）
1. ✅ `GET /health`
2. □ `GET /auth/login`
3. □ `GET /auth/callback`
4. □ `GET /auth/me`

### Phase 2（高優先）
5. □ `GET /api/guilds`
6. □ `GET /api/guilds/:guildId`
7. □ `GET /api/guilds/:guildId/config`
8. □ `PUT /api/guilds/:guildId/config`

### Phase 3（中優先）
9. □ 各種PATCH エンドポイント
10. □ DELETE エンドポイント
11. □ ログAPI

### Phase 4（低優先）
12. □ 統計API
13. □ WebSocket

---

## セキュリティ考慮事項

### 認証・認可
- JWT トークンは短命（1時間）
- リフレッシュトークン機構
- Discord権限チェック（ADMINISTRATOR or MANAGE_GUILD）

### データ保護
- HTTPS必須
- CORS設定（WebUIドメインのみ）
- CSP ヘッダー
- レート制限

### 入力検証
- Zod スキーマでバリデーション
- サニタイゼーション
- Discord ID形式チェック

---

## OpenAPI仕様（将来）

完全なAPI仕様は OpenAPI 3.0 形式で `docs/openapi.yaml` に記述予定。

Swagger UIで閲覧可能にする：
- `GET /api/docs` → Swagger UI

---

## テスト計画

### 単体テスト
- 各エンドポイントのハンドラー
- バリデーションロジック
- 認証ミドルウェア

### 統合テスト
- E2E APIリクエストフロー
- 認証フロー
- エラーハンドリング

### パフォーマンステスト
- 同時100リクエスト処理
- レート制限動作確認

---

## まとめ

このAPI設計により、WebUIから全Bot設定を管理可能になります。Discord OAuth2により安全な認証を実現し、RESTful APIで直感的な操作を提供します。
