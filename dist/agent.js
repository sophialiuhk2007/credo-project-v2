"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const config = {
    /*the label is seen by other users when creating a connection.
  This should not be used as a base for authenticity, as it
  is entirely up to the user to set this.*/
    label: "issuer-agent",
    walletConfig: {
        //walletConfig.id: Identifier string. Using another value here will open a new wallet.
        id: "wallet-id",
        //Key to unlock the wallet with. This value MUST be kept as a secret and should be seem like a password.
        key: "testkey0000000000000000000000000",
        keyDerivationMethod: core_1.KeyDerivationMethod.Argon2IMod,
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
    logger: new core_1.ConsoleLogger(core_1.LogLevel.info),
    didCommMimeType: core_1.DidCommMimeType.V1,
    useDidKeyInProtocols: true,
    connectionImageUrl: "https://static.vecteezy.com/system/resources/previews/053/547/120/non_2x/generic-user-profile-avatar-for-online-platforms-and-social-media-vector.jpg",
    autoUpdateStorageOnStartup: true,
};
const agent = new core_1.Agent({
    config,
    dependencies: node_1.agentDependencies,
    modules: {
        // Register the Askar module on the agent
        askar: new askar_1.AskarModule({
            ariesAskar: aries_askar_nodejs_1.ariesAskar,
        }),
    },
});
agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
agent.registerOutboundTransport(new core_1.WsOutboundTransport());
agent.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3000 }));
agent
    .initialize()
    .then(() => {
    console.log("Agent initialized!");
})
    .catch((e) => {
    console.error(`Something went wrong while setting up the agent! Message: ${e}`);
});
