import "dotenv/config";

export const config = {
    token: process.env.DISCORD_TOKEN || "",
    appId: process.env.DISCORD_APP_ID || "",
    locale: process.env.LOCALE || "ja",
};

export default config;