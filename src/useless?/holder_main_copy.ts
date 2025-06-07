import readline from "readline";
import fs from "fs";
import { createBobAgent, receiveInvitation } from "./holder_config_copy";
import {
  Agent,
  // W3cCredentialRecord,
  // SdJwtVcRecord,
  // KeyDidCreateOptions,
  // getJwkFromKey,
  // DidKey,
  DifPresentationExchangeService,
  ConnectionRecord,
} from "@credo-ts/core";
// import { OpenId4VciCredentialFormatProfile } from "@credo-ts/openid4vc";
// import { kMaxLength } from "buffer";

const handleAuthorizationRequestViaDidComm = async (
  bobAgent: any,
  message: any
) => {
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
};

// const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
//   const { outOfBandRecord, connectionRecord } =
//     await agent.oob.receiveInvitationFromUrl(invitationUrl);
//   return connectionRecord;
// };

const run = async () => {
  // const rl = readline.createInterface({
  //   input: process.stdin,
  //   output: process.stdout,
  // });
  // const question = (query: string) =>
  //   new Promise<string>((resolve) => rl.question(query, resolve));

  // console.log("Creating Bob agent...");
  const bobAgent = createBobAgent();

  // Listen for DIDComm authorization requests
  bobAgent.events.on("BasicMessageReceivedEvent", async (event) => {
    //added
    console.log("Received DIDComm message:", event.payload.message);
    // console.log(
    //   "Received DIDComm message:",
    //   JSON.stringify(event.payload.message, null, 2)
    // );
    // await handleAuthorizationRequestViaDidComm(bobAgent, event.payload.message);
  });

  // bobAgent.events.on("ConnectionStateChanged", ({ payload }) => {
  //   const connectionRecord = payload.connectionRecord as ConnectionRecord;
  //   console.log(
  //     "Holder connection state:",
  //     connectionRecord.state,
  //     connectionRecord.id
  //   );
  // });
  console.log(
    "Registered event names:",
    bobAgent.events["eventEmitter"]._events
  );
  await bobAgent.initialize();
  console.log("Bob agent initialized successfully.");
  // Accept invitation if not already accepted
  // Accept invitation from verifier
  let connectionId;
  if (!fs.existsSync("bob_connection_id.txt")) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const question = (query: string) =>
      new Promise<string>((resolve) => rl.question(query, resolve));
    const invitationUrl = await question(
      "Paste invitation URL from verifier: "
    );
    rl.close();

    const connectionRecord = await receiveInvitation(bobAgent, invitationUrl);
    if (!connectionRecord) {
      console.error("Failed to receive connection record from invitation.");
      process.exit(1);
    }
    connectionId = connectionRecord.id;
    //fs.writeFileSync("bob_connection_id.txt", connectionId, "utf-8");
    console.log("Invitation accepted. Connection ID saved.");
  } else {
    connectionId = fs.readFileSync("bob_connection_id.txt", "utf-8").trim();
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
};

export default run;
void run();
