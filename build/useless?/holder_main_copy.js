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
const readline_1 = __importDefault(require("readline"));
const fs_1 = __importDefault(require("fs"));
const holder_config_copy_1 = require("./holder_config_copy");
// import { OpenId4VciCredentialFormatProfile } from "@credo-ts/openid4vc";
// import { kMaxLength } from "buffer";
const handleAuthorizationRequestViaDidComm = (bobAgent, message) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Handling DIDComm authorization request...");
    // try {
    //   let resolvedAuthorizationRequest;
    //   if (message.content.startsWith("openid4vp://")) {
    //     console.log(
    //       "Received OpenID4VP request URI (via DIDComm):",
    //       message.content
    //     );
    //     resolvedAuthorizationRequest =
    //       await bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequestFromUri(
    //         message.content
    //       );
    //   } else {
    //     const authorizationRequest = JSON.parse(message.content);
    //     console.log(
    //       "Received authorization request (via DIDComm)",
    //       JSON.stringify(authorizationRequest, null, 2)
    //     );
    //     resolvedAuthorizationRequest =
    //       await bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(
    //         authorizationRequest
    //       );
    //   }
    //   console.log(
    //     "Resolved credentials for request (via DIDComm)",
    //     JSON.stringify(
    //       resolvedAuthorizationRequest.presentationExchange.credentialsForRequest,
    //       null,
    //       2
    //     )
    //   );
    //   const presentationExchangeService = bobAgent.dependencyManager.resolve(
    //     DifPresentationExchangeService
    //   );
    //   const selectedCredentials =
    //     presentationExchangeService.selectCredentialsForRequest(
    //       resolvedAuthorizationRequest.presentationExchange.credentialsForRequest
    //     );
    //   const authorizationResponse =
    //     await bobAgent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest(
    //       {
    //         authorizationRequest:
    //           resolvedAuthorizationRequest.authorizationRequest,
    //         presentationExchange: {
    //           credentials: selectedCredentials,
    //         },
    //       }
    //     );
    //   console.log(
    //     "Submitted authorization response (via DIDComm)",
    //     JSON.stringify(authorizationResponse.submittedResponse, null, 2)
    //   );
    // } catch (e) {
    //   console.error("Failed to process DIDComm authorization request:", e);
    // }
});
// const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
//   const { outOfBandRecord, connectionRecord } =
//     await agent.oob.receiveInvitationFromUrl(invitationUrl);
//   return connectionRecord;
// };
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    // const rl = readline.createInterface({
    //   input: process.stdin,
    //   output: process.stdout,
    // });
    // const question = (query: string) =>
    //   new Promise<string>((resolve) => rl.question(query, resolve));
    // console.log("Creating Bob agent...");
    const bobAgent = (0, holder_config_copy_1.createBobAgent)();
    // Listen for DIDComm authorization requests
    bobAgent.events.on("BasicMessageReceivedEvent", (event) => __awaiter(void 0, void 0, void 0, function* () {
        //added
        console.log("Received DIDComm message:", event.payload.message);
        // console.log(
        //   "Received DIDComm message:",
        //   JSON.stringify(event.payload.message, null, 2)
        // );
        // await handleAuthorizationRequestViaDidComm(bobAgent, event.payload.message);
    }));
    // bobAgent.events.on("ConnectionStateChanged", ({ payload }) => {
    //   const connectionRecord = payload.connectionRecord as ConnectionRecord;
    //   console.log(
    //     "Holder connection state:",
    //     connectionRecord.state,
    //     connectionRecord.id
    //   );
    // });
    console.log("Registered event names:", bobAgent.events["eventEmitter"]._events);
    yield bobAgent.initialize();
    console.log("Bob agent initialized successfully.");
    // Accept invitation if not already accepted
    // Accept invitation from verifier
    let connectionId;
    if (!fs_1.default.existsSync("bob_connection_id.txt")) {
        const rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const question = (query) => new Promise((resolve) => rl.question(query, resolve));
        const invitationUrl = yield question("Paste invitation URL from verifier: ");
        rl.close();
        const connectionRecord = yield (0, holder_config_copy_1.receiveInvitation)(bobAgent, invitationUrl);
        if (!connectionRecord) {
            console.error("Failed to receive connection record from invitation.");
            process.exit(1);
        }
        connectionId = connectionRecord.id;
        //fs.writeFileSync("bob_connection_id.txt", connectionId, "utf-8");
        console.log("Invitation accepted. Connection ID saved.");
    }
    else {
        connectionId = fs_1.default.readFileSync("bob_connection_id.txt", "utf-8").trim();
        console.log("Connection already established. Ready for DIDComm messages.");
    }
    // let connectionId;
    // if (!fs.existsSync("bob_connection_id.txt")) {
    //   const invitationUrl = await question("Enter the invitation URL: ");
    //   console.log("Accepting the invitation as Bob...");
    //   const connectionRecord = await receiveInvitation(bobAgent, invitationUrl);
    //   if (!connectionRecord) {
    //     console.error("Failed to receive connection record from invitation.");
    //     process.exit(1);
    //   }
    //   //fs.writeFileSync("bob_connection_id.txt", connectionRecord.id, "utf-8");
    //   connectionId = connectionRecord.id;
    //   console.log("Invitation accepted. Connection ID saved.");
    // }
    // rl.close();
    // console.log("Listening for authorization requests via DIDComm...");
    process.stdin.resume(); // Keep the process alive
});
exports.default = run;
void run();
