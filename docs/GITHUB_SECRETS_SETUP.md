# GitHub Secrets 設定手順

## 概要
GitHub ActionsでOracle Cloudへ自動デプロイするために必要なSecretsの設定手順です。

## 必要なSecrets一覧

| Secret名 | 説明 | 取得方法 |
|---------|------|---------|
| `ORACLE_SSH_PRIVATE_KEY` | Oracle Cloud InstanceへのSSH秘密鍵 | SSH鍵ペア生成 |
| `ORACLE_HOST` | Oracle Cloud InstanceのパブリックIP | OCI Console |
| `ORACLE_USER` | SSHユーザー名（通常は`ubuntu`） | - |
| `DISCORD_TOKEN` | Discord Botのトークン | Discord Developer Portal |
| `DISCORD_APP_ID` | Discord BotのアプリケーションID | Discord Developer Portal |

---

## 手順

### 1. SSH鍵ペアの生成（初回のみ）

Oracle Cloud Instanceへのアクセス用SSH鍵を生成します。

```bash
# ローカルマシンで実行
ssh-keygen -t ed25519 -C "github-actions@guild-mng-bot" -f ~/.ssh/oracle-cloud-deploy

# 秘密鍵を表示（GitHub Secretsに登録）
cat ~/.ssh/oracle-cloud-deploy

# 公開鍵を表示（Oracle Cloudに登録）
cat ~/.ssh/oracle-cloud-deploy.pub
```

**公開鍵をOracle Cloud Instanceに登録**:
```bash
# Oracle Cloud Instanceにログイン
ssh ubuntu@<ORACLE_HOST>

# 公開鍵を追加
echo "<公開鍵の内容>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

### 2. GitHub Secretsへの登録

#### 手順:
1. GitHubリポジトリページにアクセス
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** をクリック
4. 以下のSecretsを1つずつ登録

#### 登録するSecrets:

##### `ORACLE_SSH_PRIVATE_KEY`
```
# 秘密鍵の内容をそのままコピー&ペースト
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz
...（実際の秘密鍵）...
-----END OPENSSH PRIVATE KEY-----
```

**注意**:
- `-----BEGIN`と`-----END`を含めて全てコピー
- 改行も含めてそのまま貼り付け

##### `ORACLE_HOST`
```
123.456.789.012
```
Oracle Cloud InstanceのパブリックIPアドレス

**取得方法**:
1. Oracle Cloud Console
2. **Compute** → **Instances**
3. インスタンス名をクリック
4. **Instance details** → **Public IP address**をコピー

##### `ORACLE_USER`
```
ubuntu
```
通常は`ubuntu`（Ubuntu 22.04使用の場合）

##### `DISCORD_TOKEN`
```
MTIzNDU2Nzg5MDEyMzQ1Njc4OQ.AbCdEf.Gh1JkLmN0pQrStUvWxYz
```

**取得方法**:
1. [Discord Developer Portal](https://discord.com/developers/applications)
2. アプリケーションを選択
3. **Bot** → **Token** → **Reset Token**（初回は**Copy**）

##### `DISCORD_APP_ID`
```
1234567890123456789
```

**取得方法**:
1. Discord Developer Portal
2. アプリケーションを選択
3. **General Information** → **Application ID**をコピー

---

## 検証

### Secretsが正しく設定されているか確認

GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** で以下が表示されていることを確認:
- `ORACLE_SSH_PRIVATE_KEY`
- `ORACLE_HOST`
- `ORACLE_USER`
- `DISCORD_TOKEN`
- `DISCORD_APP_ID`

### デプロイワークフローをテスト

1. **手動実行でテスト**:
   - GitHubリポジトリ → **Actions** → **Deploy to Oracle Cloud**
   - **Run workflow** → **Run workflow**（mainブランチ）
   
2. **ログを確認**:
   - ワークフローが成功したか確認
   - 失敗した場合はログを確認して原因を特定

3. **Bot起動確認**:
   ```bash
   ssh ubuntu@<ORACLE_HOST>
   cd ~/guild-mng-bot
   docker compose logs -f
   ```

---

## トラブルシューティング

### SSH接続エラー
```
Permission denied (publickey)
```

**原因**: 秘密鍵が正しく設定されていない

**解決策**:
1. `ORACLE_SSH_PRIVATE_KEY`の内容を確認（`-----BEGIN`/`-----END`含む）
2. 公開鍵がOracle Cloud Instanceの`~/.ssh/authorized_keys`に登録されているか確認

### デプロイ失敗（git pull error）
```
error: Your local changes to the following files would be overwritten
```

**原因**: Oracle Cloud Instance上で手動変更がある

**解決策**:
```bash
ssh ubuntu@<ORACLE_HOST>
cd ~/guild-mng-bot
git reset --hard origin/main
```

### Bot起動失敗
```
Error: Invalid token
```

**原因**: `DISCORD_TOKEN`が間違っている

**解決策**:
1. Discord Developer Portalで新しいトークンを生成
2. GitHub Secretsの`DISCORD_TOKEN`を更新
3. ワークフローを再実行

---

## セキュリティ注意事項

### ⚠️ 重要
- **秘密鍵は絶対に公開しないこと**
- **Discord TokenをコードやIssueに記載しないこと**
- **GitHub Secretsは暗号化されており、ログに表示されない**
- **秘密鍵が漏洩した場合は即座に削除して新しい鍵を生成**

### 推奨
- SSH鍵は定期的にローテーション（3-6ヶ月ごと）
- Discord Tokenは漏洩時に即座にリセット
- Oracle Cloud InstanceのSSHポートを変更（デフォルト22以外）
- Fail2banなどのブルートフォース対策を導入

---

## 自動デプロイの流れ

1. **コード変更をmainブランチにマージ**
   ```bash
   git checkout main
   git merge refactor/webui-ready
   git push origin main
   ```

2. **GitHub Actions自動実行**
   - `.github/workflows/deploy.yml`が自動実行
   - Oracle Cloud Instanceにログイン
   - 最新コードをpull
   - `.env`を更新
   - Dockerコンテナを再ビルド&再起動

3. **デプロイ確認**
   - GitHub Actions → ワークフローログ確認
   - Discord → Botがオンラインか確認
   - Oracle Cloud → `docker compose logs -f`でログ確認

---

## まとめ

この設定により、mainブランチへのpushで自動的にOracle Cloudへデプロイされます。

**Phase 1（手動デプロイ）** → **Phase 4（自動デプロイ）** の移行が完了すると、以降は`git push origin main`だけで本番環境が更新されます。
