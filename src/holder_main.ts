import readline from "readline";
import { initializeBobAgent, receiveInvitation } from "./holder_config";
import {
  W3cCredentialRecord,
  SdJwtVcRecord,
  KeyDidCreateOptions,
  getJwkFromKey,
  DidKey,
  DifPresentationExchangeService,
} from "@credo-ts/core";
import { OpenId4VciCredentialFormatProfile } from "@credo-ts/openid4vc";

// Resolves the credential offer from a URL
const resolveCredentialOffer = async (
  bobAgent: any,
  credentialOfferUrl: string
) => {
  return await bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(
    credentialOfferUrl
  );
};

// Accepts the credential offer using pre-authorized code flow
const acceptCredentialOffer = async (
  bobAgent: any,
  resolvedCredentialOffer: any
) => {
  return await bobAgent.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(
    resolvedCredentialOffer,
    {
      credentialBindingResolver: async ({
        supportedDidMethods,
        keyType,
        supportsAllDidMethods,
        supportsJwk,
        credentialFormat,
      }: {
        supportedDidMethods?: string[];
        keyType: string;
        supportsAllDidMethods: boolean;
        supportsJwk: boolean;
        credentialFormat: string;
      }) => {
        if (supportsAllDidMethods || supportedDidMethods?.includes("did:key")) {
          const didResult = await bobAgent.dids.create({
            method: "key",
            options: { keyType },
          });

          if (didResult.didState.state !== "finished") {
            throw new Error("DID creation failed.");
          }

          const didKey = DidKey.fromDid(didResult.didState.did);

          return {
            method: "did",
            didUrl: `${didKey.did}#${didKey.key.fingerprint}`,
          };
        }

        if (
          supportsJwk &&
          credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc
        ) {
          const key = await bobAgent.wallet.createKey({ keyType });
          return {
            method: "jwk",
            jwk: getJwkFromKey(key),
          };
        }

        throw new Error("Unable to create a key binding");
      },
    }
  );
};

// Stores the received credentials
const storeCredentials = async (bobAgent: any, credentials: any[]) => {
  const records: Array<W3cCredentialRecord | SdJwtVcRecord> = [];
  for (const credential of credentials) {
    if ("compact" in credential) {
      const record = await bobAgent.sdJwtVc.store(credential.compact);
      records.push(record);
    } else {
      const record = await bobAgent.w3cCredentials.storeCredential({
        credential,
      });
      records.push(record);
    }
  }
  return records;
};

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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string) =>
    new Promise<string>((resolve) => rl.question(query, resolve));

  console.log("Initializing Bob agent...");
  const bobAgent = await initializeBobAgent();

  // connection only available for verification request not credential issuance

  const credentialOfferUrl = await question("Enter the credential offer URL: ");

  const resolvedCredentialOffer = await resolveCredentialOffer(
    bobAgent,
    credentialOfferUrl
  );
  console.log(
    "Resolved credential offer",
    JSON.stringify(resolvedCredentialOffer.credentialOfferPayload, null, 2)
  );

  const credentials = await acceptCredentialOffer(
    bobAgent,
    resolvedCredentialOffer
  );
  console.log("Received credentials", JSON.stringify(credentials, null, 2));
  const records = await storeCredentials(bobAgent, credentials);

  const authorizationRequest = await question(
    "Enter the authorization request URL: "
  );
  rl.close();
  // resolved credential offer contains the offer, metadata, etc..
  const resolvedAuthorizationRequest =
    await bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(
      authorizationRequest
    );
  if (
    resolvedAuthorizationRequest.presentationExchange &&
    resolvedAuthorizationRequest.presentationExchange.credentialsForRequest
  ) {
    console.log(
      "Resolved credentials for request",
      JSON.stringify(
        resolvedAuthorizationRequest.presentationExchange.credentialsForRequest,
        null,
        2
      )
    );

    const presentationExchangeService = bobAgent.dependencyManager.resolve(
      DifPresentationExchangeService
    );
    // Automatically select credentials. In a wallet you could manually choose which credentials to return based on the "resolvedAuthorizationRequest.presentationExchange.credentialsForRequest" value
    const selectedCredentials =
      presentationExchangeService.selectCredentialsForRequest(
        resolvedAuthorizationRequest.presentationExchange.credentialsForRequest
      );

    // issuer only supports pre-authorized flow for now
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
      "Submitted authorization response",
      JSON.stringify(authorizationResponse.submittedResponse, null, 2)
    );
  } else {
    console.error(
      "No presentationExchange or credentialsForRequest found in resolvedAuthorizationRequest."
    );
  }
  return void 0;
};

export default run;

void run();
