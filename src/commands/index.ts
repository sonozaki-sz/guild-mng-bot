import afkCommand from "./afk";
import cnfAfkCommand from "./cnfAfk";
import cnfBumpReminderCommand from "./cnfBumpReminder";
import cnfProfChannelCommand from "./cnfProfChannel";
import cnfVCCommand from "./cnfVC";
import echoCommand from "./echo";
import gameCommand from "./game";
import sendTextCommand from "./sendText";
import userInfocommand from "./userInfo";
import vcAutoCreationCommand from "./vcAutoCreation";

export const globalCommands = [
    echoCommand,
    afkCommand,
    cnfAfkCommand,
    vcAutoCreationCommand,
    cnfVCCommand,
    cnfProfChannelCommand,
    userInfocommand,
    cnfBumpReminderCommand,
    sendTextCommand,
    gameCommand,
];

export default globalCommands;