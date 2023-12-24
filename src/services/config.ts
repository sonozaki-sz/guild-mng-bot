import "dotenv/config";

export const config = {
    token: process.env.TOKEN || "",
    appId: process.env.APP_ID || "",
    locale: process.env.LOCALE || "ja",
};

export default config;