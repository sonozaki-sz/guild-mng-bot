import { ChatInputCommandInteraction, Collection, DiscordAPIError, EmbedBuilder, GuildMember, SlashCommandBuilder, TextChannel } from "discord.js";
import "../services/discord";
import { BotKeyvKeys, Command, EmbedPage, ReplyEmbedType, botKeyvs, getReplyEmbed } from "../services/discord";
import { __t } from "../services/locale";

export const userInfocommand: Command = {
    data: new SlashCommandBuilder()
        .setName("user-info")
        .setDescription(__t("bot/command/user-info/description"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("normal")
                .setDescription(__t("bot/command/user-info/normal/description"))
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription(__t("bot/command/user-info/normal/userOption/description"))
                        .setRequired(true)
                )
        ).addSubcommand(subcommand =>
            subcommand
                .setName("vc-members")
                .setDescription(__t("bot/command/user-info/vc-members/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "normal": {
                executeNormal(interaction);
                break;
            }
            case "vc-members": {
                executeVcMembers(interaction);
                break;
            }
        }
    }
};

const getProfText = async (interaction: ChatInputCommandInteraction, member: GuildMember) => {
    const profChannel = await botKeyvs.getValue(interaction.guildId!, BotKeyvKeys.ProfChannel) as TextChannel | undefined;
    if (!profChannel) {
        return __t("bot/command/unsetProfChannel");
    }
    const channel = await interaction.guild?.channels.fetch(profChannel.id)
        .catch((reason: DiscordAPIError) => {
            if (reason.code === 10003) {
                return undefined;
            }
            throw reason;
        });
    if (!channel?.isTextBased()) {
        return __t("bot/command/notFoundProfChannel");
    }
    const prof = await (async () => {
        let messageId = channel.lastMessageId || undefined;
        while (messageId) {
            const messages = await channel.messages.fetch({ limit: 100, before: messageId });
            const message = messages.find(message => message.author.id === member.id)?.content;
            if (message) {
                return message;
            }
            messageId = messages.last()?.id;
        };
    })();
    return prof || __t("blank");
};

const getUserInfoEmbes = async (interaction: ChatInputCommandInteraction, member: GuildMember) => {
    const userInfoEmbeds = new Array<EmbedBuilder>();
    userInfoEmbeds.push(
        new EmbedBuilder()
            .setTitle(member.user.tag)
            .setThumbnail(member.displayAvatarURL())
            .setColor(member.user.accentColor || member.displayColor)
            .setFields(
                { name: __t("userId"), value: member.id, inline: true },
                { name: __t("displayName"), value: member.user.displayName, inline: true },
                { name: __t("nickname"), value: member.nickname || __t("unset"), inline: true },
                { name: __t("accountCreationDateTime"), value: `<t:${Math.round(member.user.createdTimestamp / 1000)}>`, inline: true },
                { name: __t("serverJoinDateTime"), value: `<t:${Math.round(member.joinedTimestamp! / 1000)}>`, inline: true },
                { name: __t("profile"), value: await getProfText(interaction, member) },
            ),
        new EmbedBuilder()
            .setTitle(member.user.tag)
            .setThumbnail(member.displayAvatarURL())
            .setColor(member.user.accentColor || member.displayColor)
            .setFields(
                { name: __t("role"), value: member.roles.cache.sort((a, b) => b.position - a.position).map(role => role.toString()).join(", ") },
                { name: __t("authority"), value: member.permissions.toArray().join(", ") },
            )

    );
    return userInfoEmbeds;
};

const executeNormal = async (interaction: ChatInputCommandInteraction) => {
    const user = interaction.options.getUser("user")!;
    const member = await interaction.guild!.members.fetch(user.id);
    if (!member) {
        const embed = getReplyEmbed(__t("bot/command/notFoundUser", { user: user.toString() }), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }

    await interaction.deferReply();
    const replyEmbed = getReplyEmbed(__t("bot/command/user-info/success"), ReplyEmbedType.Success);
    const userInfoEmbeds = await getUserInfoEmbes(interaction, member);
    await interaction.editReply({ embeds: [replyEmbed] });
    const embedPage = new EmbedPage(interaction.channel!, userInfoEmbeds);
    await embedPage.send({ time: 300_000 });
}

const executeVcMembers = async (interaction: ChatInputCommandInteraction) => {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!member) {
        const embed = getReplyEmbed(__t("bot/command/notFoundUser", { user: interaction.user.toString() }), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    if (!member.voice.channel) {
        const embed = getReplyEmbed(__t("bot/command/user-info/vc-members/notInVc"), ReplyEmbedType.Warn);
        await interaction.reply({ embeds: [embed] });
        return;
    }
    await interaction.deferReply();
    const members = member.voice.channel.members;
    const membersInfoPages = new Collection<string, EmbedPage>(
        await Promise.all(members.map(async member => {
            const userInfoPage = new EmbedPage(interaction.channel!, await getUserInfoEmbes(interaction, member));
            return [member.displayName, userInfoPage] as const;
        }))
    );
    const replyEmbed = getReplyEmbed(__t("bot/command/user-info/success"), ReplyEmbedType.Success);
    await interaction.editReply({ embeds: [replyEmbed] });
    membersInfoPages.forEach(async page => await page.send({ time: 300_000 }));
};

export default userInfocommand;