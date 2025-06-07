"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const openid4vc_1 = require("@credo-ts/openid4vc");
const readline_1 = __importDefault(require("readline"));
const core_2 = require("@credo-ts/core");
const initializeBobAgent = () => __awaiter(void 0, void 0, void 0, function* () {
    // Simple agent configuration. This sets some basic fields like the wallet
    // configuration and the label. It also sets the mediator invitation url,
    // because this is most likely required in a mobile environment.
    const config = {
        /*the label is seen by other users when creating a connection.
    This should not be used as a base for authenticity, as it
    is entirely up to the user to set this.*/
        label: "demo-agent-bob-holder",
        walletConfig: {
            //walletConfig.id: Identifier string. Using another value here will open a new wallet.
            id: "mainBobHolderWallet",
            //Key to unlock the wallet with. This value MUST be kept as a secret and should be seem like a password.
            key: "demoagentbob00000000000000000000",
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
            openId4VcHolderModule: new openid4vc_1.OpenId4VcHolderModule(),
            // Register the Askar module on the agent
            askar: new askar_1.AskarModule({
                ariesAskar: aries_askar_nodejs_1.ariesAskar,
            }),
            connections: new core_1.ConnectionsModule({ autoAcceptConnections: true }),
        },
    });
    agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
    agent.registerOutboundTransport(new core_1.WsOutboundTransport());
    // Initialize the agent
    yield agent.initialize();
    return agent;
});
const receiveInvitation = (agent, invitationUrl) => __awaiter(void 0, void 0, void 0, function* () {
    const { outOfBandRecord } = yield agent.oob.receiveInvitationFromUrl(invitationUrl);
    return outOfBandRecord;
});
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (query) => new Promise((resolve) => rl.question(query, resolve));
    console.log("Initializing Bob agent...");
    const bobAgent = yield initializeBobAgent();
    const invitationUrl = yield question("Enter the invitation URL: ");
    console.log("Accepting the invitation as Bob...");
    yield receiveInvitation(bobAgent, invitationUrl);
    // resolved credential offer contains the offer, metadata, etc..
    const credentialOffer = yield question("Enter the credential offer URL: ");
    rl.close();
    const resolvedCredentialOffer = yield bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(credentialOffer);
    console.log("Resolved credential offer", JSON.stringify(resolvedCredentialOffer.credentialOfferPayload, null, 2));
    // issuer only supports pre-authorized flow for now
    const credentials = yield bobAgent.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(resolvedCredentialOffer, {
        credentialBindingResolver: (_a) => __awaiter(void 0, [_a], void 0, function* ({ supportedDidMethods, keyType, supportsAllDidMethods, 
        // supportsJwk now also passed
        supportsJwk, credentialFormat, }) {
            // NOTE: example implementation. Adjust based on your needs
            // Return the binding to the credential that should be used. Either did or jwk is supported
            if (supportsAllDidMethods ||
                (supportedDidMethods === null || supportedDidMethods === void 0 ? void 0 : supportedDidMethods.includes("did:key"))) {
                const didResult = yield bobAgent.dids.create({
                    method: "key",
                    options: {
                        keyType,
                    },
                });
                if (didResult.didState.state !== "finished") {
                    throw new Error("DID creation failed.");
                }
                const didKey = core_2.DidKey.fromDid(didResult.didState.did);
                return {
                    method: "did",
                    didUrl: `${didKey.did}#${didKey.key.fingerprint}`,
                };
            }
            // we also support plain jwk for sd-jwt only
            if (supportsJwk &&
                credentialFormat === openid4vc_1.OpenId4VciCredentialFormatProfile.SdJwtVc) {
                const key = yield bobAgent.wallet.createKey({
                    keyType,
                });
                // you now need to return an object instead of VerificationMethod instance
                // and method 'did' or 'jwk'
                return {
                    method: "jwk",
                    jwk: (0, core_2.getJwkFromKey)(key),
                };
            }
            throw new Error("Unable to create a key binding");
        }),
    });
    console.log("Received credentials", JSON.stringify(credentials, null, 2));
    // Store the received credentials
    const records = [];
    for (const credential of credentials) {
        if ("compact" in credential) {
            const record = yield bobAgent.sdJwtVc.store(credential.compact);
            records.push(record);
        }
        else {
            const record = yield bobAgent.w3cCredentials.storeCredential({
                credential,
            });
            records.push(record);
        }
    }
    return void 0;
});
exports.default = run;
void run();
