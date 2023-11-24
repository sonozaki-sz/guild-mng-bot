import afkCommand from "./afk";
import cnfAfkCommand from "./cnfAfk";
import cnfBumpReminderCommand from "./cnfBumpReminder";
import cnfProfChannelCommand from "./cnfProfChannel";
import cnfVCCommand from "./cnfVC";
import cnfVacCommand from "./cnfVac";
import echoCommand from "./echo";
import gameCommand from "./game";
import sendTextCommand from "./sendText";
import userInfocommand from "./userInfo";

export const globalCommands = [
    echoCommand,
    afkCommand,
    cnfAfkCommand,
    cnfVacCommand,
    cnfVCCommand,
    cnfProfChannelCommand,
    userInfocommand,
    cnfBumpReminderCommand,
    sendTextCommand,
    gameCommand,
];

export default globalCommands;