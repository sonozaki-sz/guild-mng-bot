local TOKEN_VAL = std.extVar('TOKEN');
local APP_ID_VAL = std.extVar('APP_ID');
local LOCALE_VAL = std.extVar('LOCALE');
local GUILD_ID_VAL = std.extVar('GUILD_ID');

{
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: 'guild-mng-bot-config',
    namespace: 'sonozaki-apps',
  },
  data: {
    TOKEN: TOKEN_VAL,
    APP_ID: APP_ID_VAL,
    LOCALE: LOCALE_VAL,
    GUILD_ID: GUILD_ID_VAL,
  },
}