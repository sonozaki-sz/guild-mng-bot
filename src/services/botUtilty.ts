import { Collection } from "discord.js";
import { BotKeyvKeys, botKeyvs } from "./discord";

export const getStickedMessages = async (guildId: string) => {
    const stickedMessagesJson = await botKeyvs.getValue(guildId, BotKeyvKeys.StickedMessages) as string | undefined;
    if (!stickedMessagesJson) return new Collection<string, string>();
    return new Collection<string, string>(Object.entries(JSON.parse(stickedMessagesJson)));
};

export const setStickedMessages = async (guildId: string, stickedMessages: Collection<string, string>) => {
    return await botKeyvs.setValue(guildId, BotKeyvKeys.StickedMessages, JSON.stringify(Object.fromEntries(stickedMessages)));
};