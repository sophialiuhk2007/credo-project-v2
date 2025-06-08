"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionDataMap = exports.issueCredentialOffer = exports.initializeIssuer = void 0;
const core_1 = require("@credo-ts/core");
const openid4vc_1 = require("@credo-ts/openid4vc");
const issuer_config_1 = require("./issuer_config");
const template_manager_1 = require("./template_manager");
// Hold initialized agent and issuer globally
let acmeAgent = null;
let openid4vcIssuer = null;
// Workaround: Store session data separately
const sessionDataMap = new Map();
exports.sessionDataMap = sessionDataMap;
// Initialize agent, issuer, and DID on server startup
const initializeIssuer = async () => {
    console.log("Initializing issuer...");
    acmeAgent = await (0, issuer_config_1.initializeAcmeAgentIssuer)();
    const templates = (0, template_manager_1.getAllTemplates)();
    const credentialsSupported = templates.map((template) => ({
        format: "vc+sd-jwt",
        vct: template.vct,
        id: template.id,
        cryptographic_binding_methods_supported: ["did:key"],
        cryptographic_suites_supported: [core_1.JwaSignatureAlgorithm.ES256],
    }));
    openid4vcIssuer = await acmeAgent.modules.openId4VcIssuer.createIssuer({
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
        credentialsSupported,
    });
    const issuerDidResult = await acmeAgent.dids.create({
        method: "key",
        options: {
            keyType: core_1.KeyType.Ed25519,
        },
    });
    if (issuerDidResult.didState.state !== "finished") {
        throw new Error("DID creation failed.");
    }
    else {
        console.log("Issuer DID created successfully:", issuerDidResult.didState.did);
    }
};
exports.initializeIssuer = initializeIssuer;
// Only called when issuing a credential
const issueCredentialOffer = async (data, templateId) => {
    console.log("Passing issuanceMetadata.data:", data);
    if (!acmeAgent || !openid4vcIssuer) {
        throw new Error("Issuer not initialized");
    }
    const { credentialOffer, issuanceSession } = await acmeAgent.modules.openId4VcIssuer.createCredentialOffer({
        issuerId: openid4vcIssuer.issuerId,
        offeredCredentials: [templateId],
        preAuthorizedCodeFlowConfig: {
            userPinRequired: false,
        },
        issuanceMetadata: {
            data,
        },
    });
    console.log("Offer session id:", issuanceSession.id);
    // Workaround: Store data by session ID
    if (data && issuanceSession.id) {
        sessionDataMap.set(issuanceSession.id, data);
        console.log("Stored data in sessionDataMap for session:", issuanceSession.id);
    }
    // Listen for session events
    acmeAgent.events.on(openid4vc_1.OpenId4VcIssuerEvents.IssuanceSessionStateChanged, (event) => {
        if (event.payload.issuanceSession.id === issuanceSession.id) {
            console.log("Issuance session state changed to ", event.payload.issuanceSession.state);
        }
    });
    return { credentialOffer, issuanceSession };
};
exports.issueCredentialOffer = issueCredentialOffer;
