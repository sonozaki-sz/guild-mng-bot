# guild-mng-bot
## 機能
開発中。。。
## 事前準備
1. .env.exampleを参考にBotのトークンなどを記載した.envファイルをプロジェクトルートディレクトリに作成する。

## 環境構築
### テスト環境
```bash
$ pnpm i --frozen-lockfile
```

### 本番環境
```bash
$ pnpm i --frozen-lockfile
$ pnpm run build
$ pnpm i --frozen-lockfile -P
```

## 実行
### テスト環境
```bash
$ pnpm run dev
```

### 本番環境
```bash
$ pnpm start
```

### Docker
```bash
$ docker compose up
```
