import afkCommand from "./afk";
import cnfAfkCommand from "./cnfAfk";
import cnfProfChannelCommand from "./cnfProfChannel";
import cnfRmdBumpCommand from "./cnfRmdBump";
import cnfVCCommand from "./cnfVC";
import echoCommand from "./echo";
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
    cnfRmdBumpCommand
];

export default globalCommands;