import {
  W3cCredentialRecord,
  SdJwtVcRecord,
  KeyDidCreateOptions,
  getJwkFromKey,
  DidKey,
  DifPresentationExchangeService,
} from "@credo-ts/core";

// Resolve a credential offer from a URL
export const resolveCredentialOffer = async (
  bobAgent: any,
  credentialOfferUrl: string
) => {
  return await bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(
    credentialOfferUrl
  );
};

// Accept a credential offer using pre-authorized code flow
export const acceptCredentialOffer = async (
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

        if (supportsJwk && credentialFormat === "vc+sd-jwt") {
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

// Store received credentials
export const storeCredentials = async (
  bobAgent: any,
  credentials: any[]
): Promise<Array<W3cCredentialRecord | SdJwtVcRecord>> => {
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

// Handle authorization requests received via DIDComm Basic Message
export const handleAuthorizationRequestViaDidComm = async (
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
