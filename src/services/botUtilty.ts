import { Collection } from "discord.js";
import { DiscordBotKeyvKeys, discordBotKeyvs } from "./discordBot";

export const getStickedMessages = async (guildId: string) => {
    const stickedMessagesJson = await discordBotKeyvs.getValue(guildId, DiscordBotKeyvKeys.StickedMessages) as string | undefined;
    if (!stickedMessagesJson) return new Collection<string, string>();
    return new Collection<string, string>(Object.entries(JSON.parse(stickedMessagesJson)));
};

export const setStickedMessages = async (guildId: string, stickedMessages: Collection<string, string>) => {
    return await discordBotKeyvs.setValue(guildId, DiscordBotKeyvKeys.StickedMessages, JSON.stringify(Object.fromEntries(stickedMessages)));
};