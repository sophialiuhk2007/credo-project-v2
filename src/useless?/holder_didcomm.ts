import { DifPresentationExchangeService } from "@credo-ts/core";
import fs from "fs";
import { initializeBobAgent } from "./holder_init";

const handleAuthorizationRequestViaDidComm = async (
  bobAgent: any,
  message: any
) => {
  try {
    const authorizationRequest = JSON.parse(message.content);

    const resolvedAuthorizationRequest =
      await bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(
        authorizationRequest
      );
    console.log(
      "Resolved credentials for request (via DIDComm)",
      JSON.stringify(
        resolvedAuthorizationRequest.presentationExchange.credentialsForRequest,
        null,
        2
      )
    );

    const presentationExchangeService = bobAgent.dependencyManager.resolve(
      DifPresentationExchangeService
    );
    const selectedCredentials =
      presentationExchangeService.selectCredentialsForRequest(
        resolvedAuthorizationRequest.presentationExchange.credentialsForRequest
      );

    const authorizationResponse =
      await bobAgent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest(
        {
          authorizationRequest:
            resolvedAuthorizationRequest.authorizationRequest,
          presentationExchange: {
            credentials: selectedCredentials,
          },
        }
      );
    console.log(
      "Submitted authorization response (via DIDComm)",
      JSON.stringify(authorizationResponse.submittedResponse, null, 2)
    );
  } catch (e) {
    console.error("Failed to process DIDComm authorization request:", e);
  }
};

const run = async () => {
  if (!fs.existsSync("bob_agent_initialized.txt")) {
    console.error("Agent not initialized. Run holder_init.ts first.");
    process.exit(1);
  }

  const bobAgent = await initializeBobAgent();

  // Only listen for DIDComm authorization requests
  bobAgent.events.on("BasicMessageReceivedEvent", async (event) => {
    await handleAuthorizationRequestViaDidComm(bobAgent, event.payload.message);
  });
  console.log("Listening for authorization requests via DIDComm...");
  process.stdin.resume(); // Keep the process alive
};

export default run;
void run();
