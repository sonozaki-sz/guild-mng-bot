local TOKEN = std.extVar('TOKEN');
local APP_ID = std.extVar('APP_ID');
local LOCALE = std.extVar('LOCALE');
local GUILD_ID = std.extVar('GUILD_ID');

{
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: 'guild-mng-bot-config',
    namespace: 'sonozaki-apps',
  },
  data: {
    token: TOKEN,
    appId: APP_ID,
    locale: LOCALE,
    guildId: GUILD_ID,
  },
}