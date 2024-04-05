import afkCommand from "./afk";
import cnfAfkCommand from "./cnfAfk";
import cnfBumpReminderCommand from "./cnfBumpReminder";
import cnfProfChannelCommand from "./cnfProfChannel";
import statusListCommand from "./cnfStatusList";
import cnfVacCommand from "./cnfVac";
import cnfVcCommand from "./cnfVc";
import echoCommand from "./echo";
import LeaveMemberLogCommand from "./leaveMemberLog";
import playCommand from "./play";
import sendTextCommand from "./sendText";
import userInfoCommand from "./userInfo";

export const globalCommands = [
    echoCommand,
    afkCommand,
    cnfAfkCommand,
    cnfVacCommand,
    cnfVcCommand,
    cnfProfChannelCommand,
    userInfoCommand,
    cnfBumpReminderCommand,
    sendTextCommand,
    playCommand,
    statusListCommand,
    LeaveMemberLogCommand,
    // stickMessageCommand,　// HACK: メッセージ固定機能が修正されるまで機能を塞ぐ
];

export default globalCommands;