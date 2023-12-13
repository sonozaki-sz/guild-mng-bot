import afkCommand from "./afk";
import cnfAfkCommand from "./cnfAfk";
import cnfBumpReminderCommand from "./cnfBumpReminder";
import cnfProfChannelCommand from "./cnfProfChannel";
import cnfStatusListCommand from "./cnfStatusList";
import cnfVCCommand from "./cnfVC";
import cnfVacCommand from "./cnfVac";
import echoCommand from "./echo";
import playCommand from "./play";
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
    playCommand,
    cnfStatusListCommand,
];

export default globalCommands;