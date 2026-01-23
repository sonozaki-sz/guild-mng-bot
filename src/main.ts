import { discordBot } from "./services/discordBot";

// 環境変数バリデーション
if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_APP_ID) {
    console.error('ERROR: DISCORD_TOKEN or DISCORD_APP_ID are required');
    console.error('Please set them in .env file or environment variables');
    process.exit(1);
}

discordBot.start();
