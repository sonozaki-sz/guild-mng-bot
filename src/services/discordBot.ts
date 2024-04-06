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
            logger.info(__t("log/bot/command/register/pre", { commandNames: globalCommands.map(command => command.data.name).join(", ") }));
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
                this.client.once(event.name, (...args) => event.execute(...args));
            } else {
                this.client.on(event.name, (...args) => event.execute(...args));
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
    DestAfkVcId = "destAfkVcId",
    VacTriggerVcId = "vcAutoCreation/triggerVcIds",
    IsVacEnabled = "vcAutoCreation/isEnabled",
    VacChannelIds = "vcAutoCreation/channelIds",
    ProfChannelId = "profChannelId",
    IsBumpReminderEnabled = "bumpReminder/isEnabled",
    BumpReminderMentionRole = "bumpReminder/mentionRole",
    BumpReminderRmdDate = "bumpReminder/rmdDate",
    BumpReminderMentionUsers = "bumpReminder/mentionUsers",
    StickedMessages = "stickMessage/stickedMessages",
    LeaveMemberLogChannelId = "leaveMemberLog/channelId",
}

export const discordBotKeyvs = new Keyvs();