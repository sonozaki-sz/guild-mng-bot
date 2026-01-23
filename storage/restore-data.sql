-- Guild 955749995808702494 の設定復元
-- extracted-data.txt からのデータ復元

-- VC Auto Creation - Channel IDs
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:vcAutoCreation/channelIds',
  '["1312302837132427274","1355555610183336060"]'
);

-- VC Auto Creation - Trigger VC IDs
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:vcAutoCreation/triggerVcIds',
  '["1228327473750478849"]'
);

-- Bump Reminder - Enabled
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:bumpReminder/isEnabled',
  'true'
);

-- Bump Reminder - Remind Date
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:bumpReminder/remindDate',
  '1769072777304'
);

-- Leave Member Log - Channel ID
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:leaveMemberLog/channelId',
  '"955749996282671124"'
);

-- Stick Message - Channel ID & Message ID Pairs
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:stickMessage/channelIdMessageIdPairs',
  '{"1067430249610084392":"1460181322201829601"}'
);

-- Dest AFK VC ID
INSERT OR REPLACE INTO keyv (key, value) VALUES (
  '955749995808702494:destAfkVcId',
  '"963173410656092170"'
);
