"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const fs_1 = __importDefault(require("fs"));
const holder_init_1 = require("./holder_init");
const handleAuthorizationRequestViaDidComm = async (bobAgent, message) => {
    try {
        const authorizationRequest = JSON.parse(message.content);
        const resolvedAuthorizationRequest = await bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(authorizationRequest);
        console.log("Resolved credentials for request (via DIDComm)", JSON.stringify(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest, null, 2));
        const presentationExchangeService = bobAgent.dependencyManager.resolve(core_1.DifPresentationExchangeService);
        const selectedCredentials = presentationExchangeService.selectCredentialsForRequest(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest);
        const authorizationResponse = await bobAgent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest({
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
};
const run = async () => {
    if (!fs_1.default.existsSync("bob_agent_initialized.txt")) {
        console.error("Agent not initialized. Run holder_init.ts first.");
        process.exit(1);
    }
    const bobAgent = await (0, holder_init_1.initializeBobAgent)();
    // Only listen for DIDComm authorization requests
    bobAgent.events.on("BasicMessageReceivedEvent", async (event) => {
        await handleAuthorizationRequestViaDidComm(bobAgent, event.payload.message);
    });
    console.log("Listening for authorization requests via DIDComm...");
    process.stdin.resume(); // Keep the process alive
};
exports.default = run;
void run();
