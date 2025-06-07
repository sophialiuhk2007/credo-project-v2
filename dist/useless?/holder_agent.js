"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAndConnect = void 0;
const holder_config_1 = require("../holder_config");
const readline_1 = __importDefault(require("readline"));
const initAndConnect = async () => {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (q) => new Promise((res) => rl.question(q, res));
    console.log("Initializing Bob agent...");
    const bobAgent = await (0, holder_config_1.initializeBobAgent)();
    const invitationUrl = await question("Enter the invitation URL: ");
    console.log("Accepting the invitation as Bob...");
    await (0, holder_config_1.receiveInvitation)(bobAgent, invitationUrl);
    rl.close();
    return bobAgent;
};
exports.initAndConnect = initAndConnect;
