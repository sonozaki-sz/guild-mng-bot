import "dotenv/config"

export const config = {
    token: process.env.TOKEN || "",
    appID: process.env.APP_ID || "",
    locale: process.env.LOCALE || "ja",
}