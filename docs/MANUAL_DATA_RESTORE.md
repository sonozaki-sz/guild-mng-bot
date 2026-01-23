# データ手動復元手順

## 概要
`storage/extracted-data.txt`から抽出したGuild設定を手動で復元する手順です。
**実施タイミング**: Phase 1.4（Oracle Cloud デプロイ）完了後、Botが起動してから。

## 復元対象Guild
- Guild ID: `955749995808702494`
- 設定数: 7項目

---

## 復元手順

### 1. AFK VC設定
**コマンド**: `/cnf-afk set-dest`
```
channel: 963173410656092170
```

**確認コマンド**: `/cnf-afk get-dest`

---

### 2. VC Auto Creation - Trigger VC設定
**コマンド**: `/cnf-vac start`
（自動的にトリガーVCを作成）

**手動復元が必要な場合**:
- Trigger VC ID: `1228327473750478849`
- データベースに直接設定:
  ```
  key: 955749995808702494:vcAutoCreation/triggerVcIds
  value: ["1228327473750478849"]
  ```

---

### 3. VC Auto Creation - Created Channels設定
**データベース直接設定** (Botコマンド経由では設定不可):
```
key: 955749995808702494:vcAutoCreation/channelIds
value: ["1312302837132427274","1355555610183336060"]
```

**SQLiteコマンド**:
```bash
sqlite3 storage/db.sqlite
INSERT INTO keyv (key, value) VALUES (
  '955749995808702494:vcAutoCreation/channelIds',
  '["1312302837132427274","1355555610183336060"]'
);
```

---

### 4. Leave Member Log設定
**コマンド**: `/leave-member-log set-channel`
```
channel: 955749996282671124
```

**確認コマンド**: `/leave-member-log get-channel`

---

### 5. Stick Message設定
**コマンド**: `/stick-message set`
```
channel: 1067430249610084392
message_id: 1460181322201829601
```

**データベース直接設定**:
```
key: 955749995808702494:stickMessage/channelIdMessageIdPairs
value: {"1067430249610084392":"1460181322201829601"}
```

**SQLiteコマンド**:
```bash
sqlite3 storage/db.sqlite
INSERT INTO keyv (key, value) VALUES (
  '955749995808702494:stickMessage/channelIdMessageIdPairs',
  '"{\"1067430249610084392\":\"1460181322201829601\"}"'
);
```

---

### 6. Bump Reminder - 有効化設定
**コマンド**: `/cnf-bump-reminder enable`

**データベース確認**:
```bash
sqlite3 storage/db.sqlite
SELECT * FROM keyv WHERE key LIKE '955749995808702494:bumpReminder%';
```

**期待される値**:
```
key: 955749995808702494:bumpReminder/isEnabled
value: true
```

---

### 7. Bump Reminder - Remind Date設定
**データベース直接設定**:
```
key: 955749995808702494:bumpReminder/remindDate
value: 1769072777304
```

**SQLiteコマンド**:
```bash
sqlite3 storage/db.sqlite
INSERT INTO keyv (key, value) VALUES (
  '955749995808702494:bumpReminder/remindDate',
  '1769072777304'
);
```

**注意**: この値はタイムスタンプ（ミリ秒）です。古い値なので、Botを起動後に新しいBumpコマンドを実行すれば自動更新されます。

---

## 復元検証

### すべての設定確認
**コマンド**: `/status-list`

### 個別設定確認
```
/cnf-afk status
/cnf-vac status
/leave-member-log status
/stick-message status
/cnf-bump-reminder status
```

### データベース全確認
```bash
sqlite3 storage/db.sqlite
SELECT * FROM keyv WHERE key LIKE '955749995808702494:%' ORDER BY key;
.quit
```

---

## トラブルシューティング

### コマンドが見つからない
- Bot再起動: `docker compose restart`
- コマンド登録確認: ログに "Slash commands registered" が表示されているか確認

### 設定が反映されない
1. データベース確認:
   ```bash
   sqlite3 storage/db.sqlite
   SELECT * FROM keyv WHERE key = '955749995808702494:<設定キー>';
   ```
2. Bot再起動

### Bump Reminder が動作しない
1. `remindDate`が過去の場合は無視される
2. 新しいBumpコマンドを実行して`remindDate`を更新

---

## 復元完了後の確認事項
- [ ] AFK VC設定が動作（ユーザーがAFK VCに移動できる）
- [ ] VC Auto Creation が動作（トリガーVC参加で新しいVCが作成される）
- [ ] Leave Member Log が動作（メンバー退出時にログが送信される）
- [ ] Stick Message が動作（指定メッセージがピン留めされている）
- [ ] Bump Reminder が動作（Bumpコマンド後にリマインダーが設定される）
