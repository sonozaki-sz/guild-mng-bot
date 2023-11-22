import { Client, Collection, GatewayIntentBits, Routes } from "discord.js";
import globalCommands from "./commands";
import botEvents from "./events";
import config from "./services/config";
import { Command } from "./services/discord";
import { __t } from "./services/locale";
import { logger } from "./services/logger";

const botStart = async () => {
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
    try {
        logger.info(__t("log/bot/command/register/pre"));
        // グローバルコマンドの登録
        globalCommands.map(command => client.commands.set(command.data.name, command));
        await rest.put(
            Routes.applicationCommands(config.appID),
            { body: globalCommands.map(command => command.data.toJSON()) },
        );
        logger.info(__t("log/bot/command/register/complated"));
    } catch (error: any) {
        const errorDesc = error.stack || error.message || "unknown error";
        logger.error(__t("log/bot/command/register/faild", { error: errorDesc }));
    }

    // Botのイベントを設定
    for (const event of botEvents) {
        if (event.once) {
            client.once(event.name, async (...args) => await event.execute(...args));
        } else {
            client.on(event.name, async (...args) => await event.execute(...args));
        }
        logger.info(__t("log/bot/event/set", { name: event.name }));
    }

    // Discordにログイン
    client.login(config.token)
        .catch((error: Error) => {
            const errorDesc = error.stack || error.message || "unknown error";
            logger.error(__t("log/bot/login/faild", { error: errorDesc }));
        });
};

botStart();
