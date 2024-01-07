import { Client, Collection, GatewayIntentBits, Routes } from "discord.js";
import globalCommands from "../commands";
import botEvents from "../events";
import config from "./config";
import { Command, Modal } from "./discord";
import { Keyvs } from "./keyvs";
import { __t } from "./locale";
import { logger } from "./logger";

class DiscordBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildVoiceStates,
            ]
        });
        this.client.commands = new Collection<string, Command>();
        this.client.cooldowns = new Collection<string, number>();
        this.client.modals = new Collection<string, Modal>();
    }

    public readonly client: Client;

    public async start() {
        // スラッシュコマンドの登録
        const rest = this.client.rest;
        rest.setToken(config.token);
        try {
            logger.info(__t("log/bot/command/register/pre"));
            // グローバルコマンドの登録
            globalCommands.map(command => this.client.commands.set(command.data.name, command));
            await rest.put(
                Routes.applicationCommands(config.appId),
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
                this.client.once(event.name, async (...args) => await event.execute(...args));
            } else {
                this.client.on(event.name, async (...args) => await event.execute(...args));
            }
            logger.info(__t("log/bot/event/set", { name: event.name }));
        }

        // Discordにログイン
        this.client.login(config.token)
            .catch((error: Error) => {
                const errorDesc = error.stack || error.message || "unknown error";
                logger.error(__t("log/bot/login/faild", { error: errorDesc }));
            });
    }
}

export const discordBot = new DiscordBot();

export enum DiscordBotKeyvKeys {
    DestAfkVc = "destAfkVc",
    VacTriggerVc = "vcAutoCreation/triggerVc",
    IsVacEnabled = "vcAutoCreation/isEnabled",
    VacChannels = "vcAutoCreation/channels",
    ProfChannel = "profChannel",
    IsBumpReminderEnabled = "bumpReminder/isEnabled",
    BumpReminderMentionRole = "bumpReminder/mentionRole",
    BumpReminderRmdDate = "bumpReminder/rmdDate",
    BumpReminderMentionUsers = "bumpReminder/mentionUsers",
    StickedMessages = "stickMessage/stickedMessages",
    LeaveMemberLogChannel = "leaveMemberLog/channel",
}

export const discordBotKeyvs = new Keyvs();