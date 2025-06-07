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
exports.initAndConnect = void 0;
const holder_config_1 = require("../holder_config");
const readline_1 = __importDefault(require("readline"));
const initAndConnect = () => __awaiter(void 0, void 0, void 0, function* () {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (q) => new Promise((res) => rl.question(q, res));
    console.log("Initializing Bob agent...");
    const bobAgent = yield (0, holder_config_1.initializeBobAgent)();
    const invitationUrl = yield question("Enter the invitation URL: ");
    console.log("Accepting the invitation as Bob...");
    yield (0, holder_config_1.receiveInvitation)(bobAgent, invitationUrl);
    rl.close();
    return bobAgent;
});
exports.initAndConnect = initAndConnect;
