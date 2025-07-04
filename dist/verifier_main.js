"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthorizationRequestAndSession = exports.initializeAcmeVerifierAgent = exports.verifierAgent = exports.verifierRouter = void 0;
exports.setStoreVerificationResult = setStoreVerificationResult;
exports.monitorVerificationSession = monitorVerificationSession;
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const express_1 = require("express");
const openid4vc_1 = require("@credo-ts/openid4vc");
exports.verifierRouter = (0, express_1.Router)();
let storeVerificationResult = () => { };
function setStoreVerificationResult(fn) {
    storeVerificationResult = fn;
}
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
            openId4VcVerifier: new openid4vc_1.OpenId4VcVerifierModule({
                baseUrl: "http://127.0.0.1:3000/oid4vci/verifier/",
                router: exports.verifierRouter, // <-- this is required!
            }),
            basicMessages: new core_1.BasicMessagesModule(),
        },
    });
    agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
    agent.registerOutboundTransport(new core_1.WsOutboundTransport());
    agent.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3002 })); //avoid conflict with app
    await agent.initialize();
    exports.verifierAgent = agent;
    return agent;
};
exports.initializeAcmeVerifierAgent = initializeAcmeVerifierAgent;
const createAuthorizationRequestAndSession = async (acmeVerifierAgent, openId4VcVerifier, presentationExchange) => {
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
        presentationExchange,
    });
    return { authorizationRequest, verificationSession };
};
exports.createAuthorizationRequestAndSession = createAuthorizationRequestAndSession;
function monitorVerificationSession(agent, verificationSessionId) {
    agent.events.on(openid4vc_1.OpenId4VcVerifierEvents.VerificationSessionStateChanged, async (event) => {
        if (event.payload.verificationSession.id === verificationSessionId) {
            if (event.payload.verificationSession.state ===
                openid4vc_1.OpenId4VcVerificationSessionState.ResponseVerified) {
                const verifiedAuthorizationResponse = await agent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(verificationSessionId);
                storeVerificationResult(verificationSessionId, verifiedAuthorizationResponse);
                console.log("Successfully verified presentation.", JSON.stringify(verifiedAuthorizationResponse, null, 2));
                console.log("Exiting...");
                // process.exit();
            }
        }
    });
}
