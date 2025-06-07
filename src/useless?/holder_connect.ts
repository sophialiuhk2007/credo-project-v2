import type { InitConfig } from "@credo-ts/core";
import {
  Agent,
  KeyDerivationMethod,
  ConsoleLogger,
  LogLevel,
  DidCommMimeType,
  HttpOutboundTransport,
  WsOutboundTransport,
  ConnectionsModule,
  W3cCredentialRecord,
  SdJwtVcRecord,
  W3cJsonLdVerifiableCredential,
  W3cJwtVerifiableCredential,
  W3cVerifiableCredential,
  Mdoc, // Add Mdoc import
} from "@credo-ts/core";
import { agentDependencies, HttpInboundTransport } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import {
  OpenId4VcHolderModule,
  OpenId4VciCredentialFormatProfile,
} from "@credo-ts/openid4vc";
import readline from "readline";
import { KeyDidCreateOptions, getJwkFromKey, DidKey } from "@credo-ts/core";

const initializeBobAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.

  const config: InitConfig = {
    /*the label is seen by other users when creating a connection. 
This should not be used as a base for authenticity, as it 
is entirely up to the user to set this.*/
    label: "demo-agent-bob-holder",
    walletConfig: {
      //walletConfig.id: Identifier string. Using another value here will open a new wallet.
      id: "mainBobHolderWallet",
      //Key to unlock the wallet with. This value MUST be kept as a secret and should be seem like a password.
      key: "demoagentbob00000000000000000000",
      keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
      /*The method used for key derivation of the walletConfig.key.
    Members:
    KeyDerivationMethod.Argon2IMod: uses Argon2I modular (most secure option, but slower)
    KeyDerivationMethod.Argon2Int: uses Argon2 integer (less secure, but faster)
    KeyDerivationMethod.Raw: uses no derivation method and the key must be a base58-encoded ChaCha20-Poly1305 key.*/

      // storage: {
      //     type: 'postgres_storage',
      // // depends on the storage type
      // }
    },
    endpoints: ["http://localhost:3001"],
    logger: new ConsoleLogger(LogLevel.info),
    didCommMimeType: DidCommMimeType.V1,
    useDidKeyInProtocols: true,
    connectionImageUrl:
      "https://static.vecteezy.com/system/resources/previews/053/547/120/non_2x/generic-user-profile-avatar-for-online-platforms-and-social-media-vector.jpg",
    autoUpdateStorageOnStartup: true,
  };

  const agent = new Agent({
    config,
    dependencies: agentDependencies,
    modules: {
      openId4VcHolderModule: new OpenId4VcHolderModule(),
      // Register the Askar module on the agent
      askar: new AskarModule({
        ariesAskar,
      }),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
    },
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());

  // Initialize the agent
  await agent.initialize();

  return agent;
};

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
  const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(
    invitationUrl
  );

  return outOfBandRecord;
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

  const invitationUrl = await question("Enter the invitation URL: ");

  console.log("Accepting the invitation as Bob...");
  await receiveInvitation(bobAgent, invitationUrl);

  // resolved credential offer contains the offer, metadata, etc..
  const credentialOffer = await question("Enter the credential offer URL: ");
  rl.close();
  const resolvedCredentialOffer =
    await bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(
      credentialOffer
    );
  console.log(
    "Resolved credential offer",
    JSON.stringify(resolvedCredentialOffer.credentialOfferPayload, null, 2)
  );

  // issuer only supports pre-authorized flow for now
  const credentials =
    await bobAgent.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(
      resolvedCredentialOffer,
      {
        credentialBindingResolver: async ({
          supportedDidMethods,
          keyType,
          supportsAllDidMethods,
          // supportsJwk now also passed
          supportsJwk,
          credentialFormat,
        }) => {
          // NOTE: example implementation. Adjust based on your needs
          // Return the binding to the credential that should be used. Either did or jwk is supported

          if (
            supportsAllDidMethods ||
            supportedDidMethods?.includes("did:key")
          ) {
            const didResult = await bobAgent.dids.create<KeyDidCreateOptions>({
              method: "key",
              options: {
                keyType,
              },
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

          // we also support plain jwk for sd-jwt only
          if (
            supportsJwk &&
            credentialFormat === OpenId4VciCredentialFormatProfile.SdJwtVc
          ) {
            const key = await bobAgent.wallet.createKey({
              keyType,
            });

            // you now need to return an object instead of VerificationMethod instance
            // and method 'did' or 'jwk'
            return {
              method: "jwk",
              jwk: getJwkFromKey(key),
            };
          }

          throw new Error("Unable to create a key binding");
        },
      }
    );

  console.log("Received credentials", JSON.stringify(credentials, null, 2));

  // Store the received credentials
  const records: Array<W3cCredentialRecord | SdJwtVcRecord> = [];
  for (const credential of credentials) {
    if ("compact" in credential) {
      const record = await bobAgent.sdJwtVc.store(credential.compact);
      records.push(record);
    } else {
      const record = await bobAgent.w3cCredentials.storeCredential({
        credential: credential as
          | W3cJsonLdVerifiableCredential
          | W3cJwtVerifiableCredential,
      });
      records.push(record);
    }
  }

  return void 0;
};

export default run;

void run();
