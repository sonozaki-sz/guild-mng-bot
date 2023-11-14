import afkCommand from "./afk";
import cnfAfkCommand from "./cnfAfk";
import cnfProfChannelCommand from "./cnfProf";
import cnfVCCommand from "./cnfVC";
import echoCommand from "./echo";
import vcAutoCreationCommand from "./vcAutoCreation";

export const globalCommands = [
    echoCommand,
    afkCommand,
    cnfAfkCommand,
    vcAutoCreationCommand,
    cnfVCCommand,
    cnfProfChannelCommand
];

export default globalCommands;
