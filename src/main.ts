import { Client, Collection, GatewayIntentBits, Routes } from "discord.js";
import { globalCommands } from "./commands/global";
import { events } from "./events";
import { config } from "./services/config";
import { __t } from "./services/locale";
import { logger } from "./services/logger";
import { Command } from "./types";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ]
});
client.commands = new Collection<string, Command>();
client.cooldowns = new Collection<string, number>();

// スラッシュコマンドの登録
const rest = client.rest;
rest.setToken(config.token);
(async () => {
    try {
        logger.info(__t("bot/command/register/pre"));
        // グローバルコマンドの登録
        globalCommands.map(command => client.commands.set(command.data.name, command));
        await rest.put(
            Routes.applicationCommands(config.appID),
            { body: globalCommands.map(command => command.data.toJSON()) },
        );
        // ギルドコマンドの登録
        await rest.put(
            Routes.applicationGuildCommands(config.appID, config.guildID),
            { body: [] },
        );
        logger.info(__t("bot/command/register/complated"));
    } catch (error: any) {
        const errorDesc = error.stack || error.message || "unknown error";
        logger.error(__t("bot/command/register/faild", { error: errorDesc }));
    }
})();

// Botのイベントを設定
for (const event of events) {
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info(__t("bot/event/set", { name: event.name }));
}

// Discordにログイン
client.login(config.token)
    .catch((error: Error) => {
        const errorDesc = error.stack || error.message || "unknown error";
        logger.error(__t("bot/login/faild", { error: errorDesc }));
    });
