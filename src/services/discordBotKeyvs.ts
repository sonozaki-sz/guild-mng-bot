import { Collection } from "discord.js";
import { Keyvs } from "./keyvs";

enum DiscordBotKeyvKeys {
    DestAfkVcId = "destAfkVcId",
    VacTriggerVcIds = "vcAutoCreation/triggerVcIds",
    VacChannelIds = "vcAutoCreation/channelIds",
    ProfChannelId = "profChannelId",
    IsBumpReminderEnabled = "bumpReminder/isEnabled",
    BumpReminderMentionRoleId = "bumpReminder/mentionRoleId",
    BumpReminderRemindDate = "bumpReminder/remindDate",
    BumpReminderMentionUserIds = "bumpReminder/mentionUserIds",
    StickedMessageChannelIdMessageIdPairs = "stickMessage/channelIdMessageIdPairs",
    LeaveMemberLogChannelId = "leaveMemberLog/channelId",
}

class DiscordBotKeyvs {
    public readonly keyvs = new Keyvs();

    async getDestAfkVcId(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.DestAfkVcId) as string | undefined;
    }

    async setDestAfkVcId(guildId: string, destAfkVcId: string) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.DestAfkVcId, destAfkVcId);
    }

    async deleteDestAfkVcId(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.DestAfkVcId);
    }

    async getVacTriggerVcIds(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.VacTriggerVcIds) as string[] | undefined;
    }

    async setVacTriggerVcIds(guildId: string, vacTriggerVcIds: string[]) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.VacTriggerVcIds, vacTriggerVcIds);
    }

    async deleteVacTriggerVcIds(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.VacTriggerVcIds);
    }

    async getVacChannelIds(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.VacChannelIds) as string[] | undefined;
    }

    async setVacChannelIds(guildId: string, channelIds: string[]) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.VacChannelIds, channelIds);
    }

    async deleteVacChannelIds(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.VacChannelIds);
    }

    async getProfChannelId(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.ProfChannelId) as string | undefined;
    }

    async setProfChannelId(guildId: string, profChannelId: string) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.ProfChannelId, profChannelId);
    }

    async deleteProfChannelId(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.ProfChannelId);
    }

    async getIsBumpReminderEnabled(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.IsBumpReminderEnabled) as boolean | undefined;
    }

    async setIsBumpReminderEnabled(guildId: string, isEnabled: boolean) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.IsBumpReminderEnabled, isEnabled);
    }
    async deleteIsBumpReminderEnabled(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.IsBumpReminderEnabled);
    }

    async getBumpReminderMentionRoleId(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.BumpReminderMentionRoleId) as string | undefined;
    }

    async setBumpReminderMentionRoleId(guildId: string, mentionRole: string) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.BumpReminderMentionRoleId, mentionRole);
    }

    async deleteBumpReminderMentionRoleId(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.BumpReminderMentionRoleId);
    }

    async getBumpReminderRemindDate(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.BumpReminderRemindDate) as number | undefined;
    }

    async setBumpReminderRemindDate(guildId: string, remindDate: number) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.BumpReminderRemindDate, remindDate);
    }

    async deleteBumpReminderRemindDate(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.BumpReminderRemindDate);
    }

    async getBumpReminderMentionUserIds(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.BumpReminderMentionUserIds) as string[] | undefined;
    }

    async setBumpReminderMentionUserIds(guildId: string, mentionUsers: string[]) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.BumpReminderMentionUserIds, mentionUsers);
    }

    async deleteBumpReminderMentionUserIds(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.BumpReminderMentionUserIds);
    }

    async getStickedMessageChannelIdMessageIdPairs(guildId: string) {
        return await this.keyvs.getCollection(guildId, DiscordBotKeyvKeys.StickedMessageChannelIdMessageIdPairs) as Collection<string, string> | undefined;
    }

    async setStickedMessageChannelIdMessageIdPairs(guildId: string, channelIdMessageIdPairs: Collection<string, string>) {
        await this.keyvs.setCollection(guildId, DiscordBotKeyvKeys.StickedMessageChannelIdMessageIdPairs, channelIdMessageIdPairs);
    }

    async deleteStickedMessageChannelIdMessageIdPairs(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.StickedMessageChannelIdMessageIdPairs);
    }

    async getLeaveMemberLogChannelId(guildId: string) {
        return await this.keyvs.getValue(guildId, DiscordBotKeyvKeys.LeaveMemberLogChannelId) as string | undefined;
    }

    async setLeaveMemberLogChannelId(guildId: string, channelId: string) {
        await this.keyvs.setValue(guildId, DiscordBotKeyvKeys.LeaveMemberLogChannelId, channelId);
    }

    async deleteLeaveMemberLogChannelId(guildId: string) {
        await this.keyvs.deleteValue(guildId, DiscordBotKeyvKeys.LeaveMemberLogChannelId);
    }
}

export const discordBotKeyvs = new DiscordBotKeyvs();
