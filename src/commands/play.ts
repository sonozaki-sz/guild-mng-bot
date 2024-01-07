import { ActionRowBuilder, ChatInputCommandInteraction, Collection, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import { Command } from "../services/discord";
import { __t } from "../services/locale";

export const playCommand: Command = {
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription(__t("bot/command/play/description"))
        .addSubcommand(subcommand =>
            subcommand
                .setName("rps")
                .setDescription(__t("bot/command/play/rps/description"))
        ),
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case "rps": {
                executeRps(interaction);
                break;
            }
        }
    },
};

const rpsHands = new Collection<number, { handName: string, handEmoji: string }>([
    [0, { handName: __t("rps/rock"), handEmoji: "✊🏻" }],
    [1, { handName: __t("rps/scissors"), handEmoji: "✌🏻" }],
    [2, { handName: __t("rps/paper"), handEmoji: "🖐🏻" }],
]);

const judgeRps = (botHandIndex: number, userHandIndex: number): { result: 0 | 1 | 2, resultText: string } => {
    const result = ((botHandIndex, userHandIndex) => {
        if (botHandIndex === userHandIndex) {
            return 0; // 引き分け
        } else if (
            (botHandIndex === 0 && userHandIndex === 1) ||
            (botHandIndex === 1 && userHandIndex === 2) ||
            (botHandIndex === 2 && userHandIndex === 0)
        ) {
            return 1; // ボットの勝ち
        } else {
            return 2; // 相手の勝ち
        }
    })(botHandIndex, userHandIndex);
    const resultText = __t("bot/command/play/rps/result", { botHand: rpsHands.get(botHandIndex)?.handEmoji!, userHand: rpsHands.get(userHandIndex)?.handEmoji! });
    return { result: result, resultText: resultText }
};

const executeRps = async (interaction: ChatInputCommandInteraction) => {
    await interaction.reply(__t("bot/command/play/rps/ready"));
    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("selectRps")
                .setPlaceholder(__t("rps/selectMenu/selectHand"))
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(rpsHands.map((value, key) => {
                    return {
                        label: `${value.handName}:${value.handEmoji}`,
                        value: key.toString(),
                    } as const;
                }))
        );
    const message = await interaction.followUp({ components: [actionRow], ephemeral: true });
    const collector = message.createMessageComponentCollector<ComponentType.StringSelect>({ time: 300_000 });
    collector.on("collect", async (stringSelectMenuInteraction) => {
        if (stringSelectMenuInteraction.customId === "selectRps") {
            collector.stop();
            const botHandIndex = rpsHands.randomKey()!;
            const userHandIndex = Number(stringSelectMenuInteraction.values[0]);
            const rpsResult = judgeRps(botHandIndex, userHandIndex);
            const botResponse = ((result) => {
                switch (result) {
                    case 0: {
                        return __t("bot/command/play/rps/botDraw");
                    }
                    case 1: {
                        return __t("bot/command/play/rps/botWin");
                    }
                    case 2: {
                        return __t("bot/command/play/rps/botLose");
                    }
                }
            })(rpsResult.result);
            await stringSelectMenuInteraction.update({ content: rpsHands.get(userHandIndex)?.handEmoji, components: [] });
            await (await stringSelectMenuInteraction.followUp(rpsResult.resultText)).reply(botResponse);
        }
    });
    collector.once("end", async (_, reason) => {
        if (reason === "time") {
            await interaction.followUp(__t("bot/command/play/rps/timeout"));
        }
        message.edit({ components: [] });
    });
};

export default playCommand;