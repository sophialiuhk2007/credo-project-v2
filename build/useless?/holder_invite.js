"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveInvitation = void 0;
const readline_1 = __importDefault(require("readline"));
const holder_init_1 = require("./holder_init");
const fs_1 = __importDefault(require("fs"));
const receiveInvitation = (agent, invitationUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const { outOfBandRecord, connectionRecord } = yield agent.oob.receiveInvitationFromUrl(invitationUrl);
    return connectionRecord;
});
exports.receiveInvitation = receiveInvitation;
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs_1.default.existsSync("bob_agent_initialized.txt")) {
        console.error("Agent not initialized. Run holder_init.ts first.");
        process.exit(1);
    }
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (q) => new Promise((res) => rl.question(q, res));
    const bobAgent = yield (0, holder_init_1.initializeBobAgent)();
    const invitationUrl = yield question("Enter the invitation URL: ");
    rl.close();
    console.log("Accepting the invitation as Bob...");
    const connectionRecord = yield (0, exports.receiveInvitation)(bobAgent, invitationUrl);
    if (connectionRecord) {
        fs_1.default.writeFileSync("bob_connection_id.txt", connectionRecord.id, "utf-8");
        console.log("Invitation accepted. Connection ID saved.");
        console.log("Connection state:", connectionRecord.state);
    }
    else {
        console.error("Failed to receive a valid connection record from the invitation.");
        process.exit(1);
    }
});
exports.default = run;
void run();
