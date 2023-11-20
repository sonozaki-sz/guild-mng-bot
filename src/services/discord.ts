import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ColorResolvable, Colors, ComponentType, EmbedBuilder, FetchMessagesOptions, GuildMessageManager, Message, StringSelectMenuBuilder, StringSelectMenuInteraction, TextBasedChannel } from "discord.js";
import { __t } from "./locale";

export const GetReplyEmbed = (message: string, type: ReplyEmbedType) => {
    const embedData: { title: string, color: ColorResolvable } = ((type) => {
        switch (type) {
            case ReplyEmbedType.Success:
                return { title: `:white_check_mark:${__t("success")}`, color: Colors.Green };
            case ReplyEmbedType.Info:
                return { title: `:information_source:${__t("info")}`, color: Colors.Blue };
            case ReplyEmbedType.Warn:
                return { title: `:warning:${__t("warn")}`, color: Colors.Yellow };
            case ReplyEmbedType.Error:
                return { title: `:no_entry_sign:${__t("error")}`, color: Colors.Red };
        }
    })(type);
    return new EmbedBuilder()
        .setTitle(embedData.title)
        .setDescription(message)
        .setColor(embedData.color);
}

export enum ReplyEmbedType {
    Success,
    Info,
    Warn,
    Error,
}

GuildMessageManager.prototype.fetchMany = async function (
    options?: FetchMessagesOptions
): Promise<Collection<string, Message<true>>> {
    if ((options?.limit ?? 50) <= 100) {
        return await this.fetch(options);
    }

    const filterOptionCount = (options?.before ? 1 : 0) + (options?.after ? 1 : 0) + (options?.around ? 1 : 0);

    if (filterOptionCount > 1) {
        return new Collection<string, Message<true>>();
    }

    const fetchMessagesBefore = async (limit: number, targetMessageID: string): Promise<Collection<string, Message<true>>> => {
        let messages = new Collection<string, Message<true>>();
        let messageID = targetMessageID || undefined;
        for (let remainingCount = limit; remainingCount > 0 && messageID; remainingCount -= 100) {
            const limit = (remainingCount <= 100) ? remainingCount : 100;
            const msgs = await this.fetch({ limit: limit, before: messageID, cache: options?.cache });
            messages = messages.concat(msgs);
            messageID = msgs.last()?.id;
        }
        return messages;
    };

    const fetchMessagesAfter = async (limit: number, targetMessageID: string): Promise<Collection<string, Message<true>>> => {
        let messages = new Collection<string, Message<true>>();
        let messageID = targetMessageID || undefined;
        for (let remainingCount = limit; remainingCount > 0 && messageID; remainingCount -= 100) {
            const limit = (remainingCount <= 100) ? remainingCount : 100;
            const msgs = (await this.fetch({ limit: limit, after: messageID, cache: options?.cache }));
            messages = messages.concat(msgs.reverse());
            messageID = msgs.last()?.id;
        }
        return messages.reverse();
    };

    // 取得条件がLimitのみの場合
    if (filterOptionCount === 0) {
        return await fetchMessagesBefore(options?.limit!, this.channel.lastMessageId!);
    }

    // 取得条件にBeforeが指定されている場合
    if (options?.before) {
        return await fetchMessagesBefore(options?.limit!, options.before);
    }

    // 取得条件にAfterが指定されている場合
    if (options?.after) {
        return await fetchMessagesAfter(options?.limit!, options.after);
    }

    // 取得条件にAroundが指定されている場合
    if (options?.around) {
        let messages = new Collection<string, Message<true>>();
        const limit = Math.floor(options?.limit! / 2);
        messages = await fetchMessagesAfter(limit, options.around);
        messages = messages.concat(await this.fetch({ limit: 1, around: options.around, cache: options?.cache }));
        messages = messages.concat(await fetchMessagesBefore(limit, options.around));
        return messages;
    }

    return new Collection<string, Message<true>>();
};

export class EmbedPage {
    private _channel: TextBasedChannel;
    private _pages: EmbedBuilder[];
    private _currentPageIndex: number;
    private _actionRows: Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>>;

    constructor(channel: TextBasedChannel, pages: EmbedBuilder[]) {
        this._channel = channel;
        this._pages = pages;
        this._pages.forEach((page, index, pages) => {
            page.setFooter({ text: __t("footer/page", { page: `${index + 1}/${pages.length}` }) });
        });
        this._currentPageIndex = 0;
        this._actionRows = new Array<ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>>(
            new ActionRowBuilder<ButtonBuilder>(
                {
                    components: [
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            customId: "toFirst",
                            label: __t("toFirst"),
                            emoji: "⏮",
                            disabled: true,
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            customId: "toPrevious",
                            label: __t("toPrevious"),
                            emoji: "◀",
                            disabled: true,
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Danger,
                            customId: "delete",
                            label: __t("delete"),
                            emoji: "🗑",
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            customId: "toNext",
                            label: __t("toNext"),
                            emoji: "▶",
                        },
                        {
                            type: ComponentType.Button,
                            style: ButtonStyle.Primary,
                            customId: "toLast",
                            label: __t("toLast"),
                            emoji: "⏭",
                        }
                    ]
                }
            ),
            new ActionRowBuilder<StringSelectMenuBuilder>(
                {
                    components: [
                        {
                            type: ComponentType.StringSelect,
                            customId: "selectPage",
                            placeholder: __t("selectPage"),
                            minValues: 1,
                            maxValues: 1,
                            options: pages.map((value, index) => {
                                return {
                                    label: `${index + 1}`,
                                    value: index.toString(),
                                }
                            })
                        }
                    ]
                }
            ),
        );
    }

    public async send() {
        const message = await this._channel.send({ embeds: [this._pages[this._currentPageIndex]], components: this._actionRows });
        const collector = message.createMessageComponentCollector({ time: 300000 });
        collector.on("collect", async interaction => {
            await interaction.deferUpdate();
            switch (interaction.customId) {
                case "toFirst":
                    this._currentPageIndex = 0;
                    break;
                case "toPrevious":
                    this._currentPageIndex = (this._currentPageIndex - 1 + this._pages.length) % this._pages.length;
                    break;
                case "delete":
                    await message.delete();
                    collector.stop("delete");
                    return;
                case "toNext":
                    this._currentPageIndex = (this._currentPageIndex + 1) % this._pages.length;
                    break;
                case "toLast":
                    this._currentPageIndex = this._pages.length - 1;
                    break;
                case "selectPage":
                    this._currentPageIndex = parseInt((interaction as StringSelectMenuInteraction).values[0]);
                    break;
            }

            if (this._currentPageIndex === 0) {
                this._actionRows[0].components[0].setDisabled(true);
                this._actionRows[0].components[1].setDisabled(true);
            } else {
                this._actionRows[0].components[0].setDisabled(false);
                this._actionRows[0].components[1].setDisabled(false);
            }

            if (this._currentPageIndex === this._pages.length - 1) {
                this._actionRows[0].components[3].setDisabled(true);
                this._actionRows[0].components[4].setDisabled(true);
            } else {
                this._actionRows[0].components[3].setDisabled(false);
                this._actionRows[0].components[4].setDisabled(false);
            }

            await interaction.editReply({ embeds: [this._pages[this._currentPageIndex]], components: this._actionRows });
        });
        collector.once("end", async (interactions, reason) => {
            if (reason === "time") {
                const embed = GetReplyEmbed(__t("operationTimeOut", { target: message.url! }), ReplyEmbedType.Info);
                this._channel.send({ embeds: [embed] });
            }
        });
    }
}