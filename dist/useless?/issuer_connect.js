"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const express_1 = __importStar(require("express"));
const openid4vc_1 = require("@credo-ts/openid4vc");
const issuerRouter = (0, express_1.Router)();
const app = (0, express_1.default)();
app.use("/oid4vci", issuerRouter);
const initializeAcmeAgent = async () => {
    // Simple agent configuration. This sets some basic fields like the wallet
    // configuration and the label.
    const config = {
        /*the label is seen by other users when creating a connection.
    This should not be used as a base for authenticity, as it
    is entirely up to the user to set this.*/
        label: "demo-agent-acme",
        walletConfig: {
            //walletConfig.id: Identifier string. Using another value here will open a new wallet.
            id: "mainAcmeIssuerWallet",
            //Key to unlock the wallet with. This value MUST be kept as a secret and should be seem like a password.
            key: "demoagentissueracme0000000000000000000 s",
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
        endpoints: ["http://localhost:3001"],
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
            openId4VcIssuer: new openid4vc_1.OpenId4VcIssuerModule({
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
    agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
    agent.registerOutboundTransport(new core_1.WsOutboundTransport());
    agent.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3001 })); //avoid conflict with app
    // Initialize the agent
    await agent.initialize();
    return agent;
};
const createNewInvitation = async (agent) => {
    const outOfBandRecord = await agent.oob.createInvitation();
    return {
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
            domain: "http://localhost:3001",
        }),
        outOfBandRecord,
    };
};
const setupConnectionListener = (agent, outOfBandRecord, cb) => {
    agent.events.on(core_1.ConnectionEventTypes.ConnectionStateChanged, ({ payload }) => {
        if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id)
            return;
        if (payload.connectionRecord.state === core_1.DidExchangeState.Completed) {
            // the connection is now ready for usage in other protocols!
            console.log(`Connection for out-of-band id ${outOfBandRecord.id} completed`);
            // Custom business logic can be included here
            // In this example we can send a basic message to the connection, but
            // anything is possible
            // cb();
            // We exit the flow
            process.exit(0);
        }
    });
};
const run = async () => {
    console.log("Initializing Acme agent...");
    const acmeAgent = await initializeAcmeAgent();
    /*since issuance of vc=sd-jwt is not supported over DIDComm
  so this part is commented out in the issuer part and kept
  only in the verifier part*/
    // console.log("Creating the invitation as Acme...");
    // const { outOfBandRecord, invitationUrl } = await createNewInvitation(
    //   acmeAgent
    // );
    // console.log("Listening for connection changes...");
    // setupConnectionListener(acmeAgent, outOfBandRecord, () =>
    //   console.log(
    //     "We now have an active connection to use in the following tutorials"
    //   )
    // );
    // console.log(`Waiting to accept the invitation from Bob... ${invitationUrl}`);
    const openid4vcIssuer = await acmeAgent.modules.openId4VcIssuer.createIssuer({
        display: [
            {
                name: "ACME Corp.",
                description: "ACME Corp. is a company that provides the best services.",
                text_color: "#000000",
                background_color: "#FFFFFF",
                logo: {
                    url: "https://static.vecteezy.com/system/resources/previews/053/547/120/non_2x/generic-user-profile-avatar-for-online-platforms-and-social-media-vector.jpg",
                    alt_text: "ACME Corp. logo",
                },
            },
        ],
        credentialsSupported: [
            {
                format: "vc+sd-jwt",
                vct: "AcmeCorpEmployee", //type of credentials it can issue
                id: "AcmeCorpEmployee",
                cryptographic_binding_methods_supported: ["did:key"],
                cryptographic_suites_supported: [core_1.JwaSignatureAlgorithm.ES256],
            },
        ],
    });
    // Create a did:key that we will use for issuance
    const issuerDidResult = await acmeAgent.dids.create({
        method: "key",
        options: {
            keyType: core_1.KeyType.Ed25519,
        },
    });
    if (issuerDidResult.didState.state !== "finished") {
        throw new Error("DID creation failed.");
    }
    const { credentialOffer, issuanceSession } = await acmeAgent.modules.openId4VcIssuer.createCredentialOffer({
        issuerId: openid4vcIssuer.issuerId,
        // values must match the `id` of the credential supported by the issuer
        offeredCredentials: ["AcmeCorpEmployee"],
        // Only pre-authorized code flow is supported
        preAuthorizedCodeFlowConfig: {
            userPinRequired: false,
        },
        // You can store any metadata about the issuance here
        issuanceMetadata: {
            someKey: "someValue",
        },
    });
    // Listen and react to changes in the issuance session
    acmeAgent.events.on(openid4vc_1.OpenId4VcIssuerEvents.IssuanceSessionStateChanged, (event) => {
        if (event.payload.issuanceSession.id === issuanceSession.id) {
            console.log("Issuance session state changed to ", event.payload.issuanceSession.state);
        }
    });
    return void 0;
};
exports.default = run;
app.listen(3000);
void run();
