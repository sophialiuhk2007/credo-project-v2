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
const verifierRouter = (0, express_1.Router)();
const app = (0, express_1.default)();
app.use("/oid4vci", verifierRouter);
const initializeAcmeVerifierAgent = async () => {
    const config = {
        label: "verifier-agent",
        walletConfig: {
            id: "mainAcmeVerifierWallet",
            key: "demoagentverifieracme0000000000000000000",
            keyDerivationMethod: core_1.KeyDerivationMethod.Argon2IMod,
        },
        endpoints: ["http://localhost:3002"],
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
            askar: new askar_1.AskarModule({
                ariesAskar: aries_askar_nodejs_1.ariesAskar,
            }),
            connections: new core_1.ConnectionsModule({ autoAcceptConnections: true }),
            openId4VcVerifier: new openid4vc_1.OpenId4VcVerifierModule({
                baseUrl: "http://127.0.0.1:3003/oid4vci/",
                router: verifierRouter,
            }),
            basicMessagesModule: new core_1.BasicMessagesModule(),
        },
    });
    agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
    agent.registerOutboundTransport(new core_1.WsOutboundTransport());
    agent.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3002 })); //avoid conflict with app
    await agent.initialize();
    return agent;
};
const createNewInvitation = async (agent) => {
    const outOfBandRecord = await agent.oob.createInvitation();
    return {
        invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
            domain: "http://localhost:3002",
        }),
        outOfBandRecord,
    };
};
const setupConnectionListener = (agent, outOfBandRecord, cb) => {
    agent.events.on(core_1.ConnectionEventTypes.ConnectionStateChanged, async ({ payload }) => {
        if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id)
            return;
        if (payload.connectionRecord.state === core_1.DidExchangeState.Completed) {
            console.log(`Connection for out-of-band id ${outOfBandRecord.id} completed`);
            // Custom business logic: send a basic message
            await cb(payload.connectionRecord.id);
            process.exit(0);
        }
    });
};
const createAuthorizationRequestAndSession = async (acmeVerifierAgent, openId4VcVerifier) => {
    // Create a did:key that we will use for signing OpenID4VP authorization requests
    const verifierDidResult = await acmeVerifierAgent.dids.create({
        method: "key",
        options: {
            keyType: core_1.KeyType.Ed25519,
        },
    });
    if (verifierDidResult.didState.state !== "finished") {
        throw new Error("DID creation failed.");
    }
    const verifierDidKey = core_1.DidKey.fromDid(verifierDidResult.didState.did);
    const { authorizationRequest, verificationSession } = await acmeVerifierAgent.modules.openId4VcVerifier.createAuthorizationRequest({
        verifierId: openId4VcVerifier.verifierId,
        requestSigner: {
            didUrl: `${verifierDidKey.did}#${verifierDidKey.key.fingerprint}`,
            method: "did",
        },
        // Add DIF presentation exchange data
        presentationExchange: {
            definition: {
                id: "9ed05140-b33b-445e-a0f0-9a23aa501868",
                name: "Employee Verification",
                purpose: "We need to verify your employee status to grant access to the employee portal",
                input_descriptors: [
                    {
                        id: "9c98fb43-6fd5-49b1-8dcc-69bd2a378f23",
                        constraints: {
                            // Require limit disclosure
                            limit_disclosure: "required",
                            fields: [
                                {
                                    filter: {
                                        type: "string",
                                        const: "AcmeCorpEmployee",
                                    },
                                    path: ["$.vct"],
                                },
                            ],
                        },
                    },
                ],
            },
        },
    });
    return { authorizationRequest, verificationSession };
};
const run = async () => {
    console.log("Initializing Acme Verifier agent...");
    const acmeVerifierAgent = await initializeAcmeVerifierAgent();
    console.log("Creating the invitation as Acme Verifier...");
    const { outOfBandRecord, invitationUrl } = await createNewInvitation(acmeVerifierAgent);
    console.log(`Share this invitation with Bob: ${invitationUrl}`);
    const openId4VcVerifier = await acmeVerifierAgent.modules.openId4VcVerifier.createVerifier({});
    const { authorizationRequest, verificationSession } = await createAuthorizationRequestAndSession(acmeVerifierAgent, openId4VcVerifier);
    console.log("Created OpenID4VC authorization request", JSON.stringify(authorizationRequest, null, 2));
    setupConnectionListener(acmeVerifierAgent, outOfBandRecord, async (connectionId) => {
        await acmeVerifierAgent.basicMessages.sendMessage(connectionId, "hello Bob, please accept this invitation and send me your credentials."
        // JSON.stringify(authorizationRequest, null, 2)
        );
    });
    // acmeVerifierAgent.events.on<ConnectionStateChangedEvent>(
    //   ConnectionEventTypes.ConnectionStateChanged,
    //   async ({ payload }) => {
    //     console.log(
    //       "Connection event fired:",
    //       payload.connectionRecord.state,
    //       payload.connectionRecord.outOfBandId
    //     );
    //     await sendAuthorizationRequestViaDidComm(
    //       acmeVerifierAgent,
    //       payload.connectionRecord.id,
    //       authorizationRequest
    //     );
    //     console.log("Authorization request sent via DIDComm.");
    //   }
    // );
    acmeVerifierAgent.events.on(openid4vc_1.OpenId4VcVerifierEvents.VerificationSessionStateChanged, async (event) => {
        if (event.payload.verificationSession.id === verificationSession.id) {
            console.log("Verification session state changed to ", event.payload.verificationSession.state);
        }
        if (event.payload.verificationSession.state ===
            openid4vc_1.OpenId4VcVerificationSessionState.ResponseVerified) {
            const verifiedAuthorizationResponse = await acmeVerifierAgent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(verificationSession.id);
            console.log("Successfully verified presentation.", verifiedAuthorizationResponse);
            console.log("Exiting...");
            process.exit();
        }
    });
    app.listen(3003);
};
exports.default = run;
void run();
