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
} from "@credo-ts/core";
import { agentDependencies, HttpInboundTransport } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import { OpenId4VcHolderModule } from "@credo-ts/openid4vc";

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
  endpoints: ["https://localhost:3000"],
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
