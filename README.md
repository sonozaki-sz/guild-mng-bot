# guild-mng-bot
## 概要
開発は凍結し保守のみの運用。今後は[ayasono](https://github.com/sonozaki-sz/ayasono)で開発を行う。
## 事前準備
1. .env.exampleを参考にBotのトークンなどを記載した.envファイルをプロジェクトルートディレクトリに作成する。

## 環境構築
### 開発環境
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
### 開発環境
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
