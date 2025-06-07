import readline from "readline";
import { initializeBobAgent } from "./holder_init";
import {
  W3cCredentialRecord,
  SdJwtVcRecord,
  KeyDidCreateOptions,
  getJwkFromKey,
  DidKey,
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

const run = async () => {
  const bobAgent = await initializeBobAgent();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (q: string) =>
    new Promise<string>((res) => rl.question(q, res));

  const credentialOfferUrl = await question("Enter the credential offer URL: ");
  rl.close();

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
};

export default run;
void run();
