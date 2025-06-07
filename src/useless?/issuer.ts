import type { InitConfig } from "@credo-ts/core";
import {
  Agent,
  KeyDerivationMethod,
  ConsoleLogger,
  LogLevel,
  DidCommMimeType,
  HttpOutboundTransport,
  WsOutboundTransport,
} from "@credo-ts/core";
import { agentDependencies, HttpInboundTransport } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import express, { Router } from "express";
import {
  OpenId4VcIssuerModule,
  OpenId4VcVerifierModule,
} from "@credo-ts/openid4vc";

const issuerRouter = Router();
const app = express();
app.use("/oid4vci", issuerRouter);

const config: InitConfig = {
  /*the label is seen by other users when creating a connection. 
This should not be used as a base for authenticity, as it 
is entirely up to the user to set this.*/
  label: "demo-agent-acme",
  walletConfig: {
    //walletConfig.id: Identifier string. Using another value here will open a new wallet.
    id: "mainAcmeIssuerWallet",
    //Key to unlock the wallet with. This value MUST be kept as a secret and should be seem like a password.
    key: "demoagentissueracme0000000000000000000 s",
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
  endpoints: ["https://localhost:3001"],
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
    // Register the Askar module on the agent
    askar: new AskarModule({
      ariesAskar,
    }),
    openId4VcIssuer: new OpenId4VcIssuerModule({
      baseUrl: "http://127.0.0.1:3000/oid4vci",

      // If no router is passed, one will be created.
      // you still have to register the router on your express server
      // but you can access it on agent.modules.openId4VcIssuer.config.router
      // It works the same for verifier: agent.modules.openId4VcVerifier.config.router
      router: issuerRouter,

      // Each of the endpoints can have configuration associated with it, such as the
      // path (under the baseUrl) to use for the endpoints.
      endpoints: {
        // The credentialRequestToCredentialMapper is the only required endpoint
        // configuration that must be provided. This method is called whenever a
        // credential request has been received for an offer we created. The callback should
        // return the issued credential to return in the credential response to the holder.
        credential: {
          credentialRequestToCredentialMapper: async () => {
            throw new Error("Not implemented");
          },
        },
      },
    }),
  },
});

agent.registerOutboundTransport(new HttpOutboundTransport());
agent.registerOutboundTransport(new WsOutboundTransport());
agent.registerInboundTransport(new HttpInboundTransport({ port: 3001 })); //avoid conflict with app

agent
  .initialize()
  .then(() => {
    console.log("Agent initialized!");
  })
  .catch((e) => {
    console.error(
      `Something went wrong while setting up the agent! Message: ${e}`
    );
  });

app.listen(3000);
