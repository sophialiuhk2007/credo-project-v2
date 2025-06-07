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
const core_1 = require("@credo-ts/core");
const fs_1 = __importDefault(require("fs"));
const holder_init_1 = require("./holder_init");
const handleAuthorizationRequestViaDidComm = (bobAgent, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authorizationRequest = JSON.parse(message.content);
        const resolvedAuthorizationRequest = yield bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(authorizationRequest);
        console.log("Resolved credentials for request (via DIDComm)", JSON.stringify(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest, null, 2));
        const presentationExchangeService = bobAgent.dependencyManager.resolve(core_1.DifPresentationExchangeService);
        const selectedCredentials = presentationExchangeService.selectCredentialsForRequest(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest);
        const authorizationResponse = yield bobAgent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest({
            authorizationRequest: resolvedAuthorizationRequest.authorizationRequest,
            presentationExchange: {
                credentials: selectedCredentials,
            },
        });
        console.log("Submitted authorization response (via DIDComm)", JSON.stringify(authorizationResponse.submittedResponse, null, 2));
    }
    catch (e) {
        console.error("Failed to process DIDComm authorization request:", e);
    }
});
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs_1.default.existsSync("bob_agent_initialized.txt")) {
        console.error("Agent not initialized. Run holder_init.ts first.");
        process.exit(1);
    }
    const bobAgent = yield (0, holder_init_1.initializeBobAgent)();
    // Only listen for DIDComm authorization requests
    bobAgent.events.on("BasicMessageReceivedEvent", (event) => __awaiter(void 0, void 0, void 0, function* () {
        yield handleAuthorizationRequestViaDidComm(bobAgent, event.payload.message);
    }));
    console.log("Listening for authorization requests via DIDComm...");
    process.stdin.resume(); // Keep the process alive
});
exports.default = run;
void run();
