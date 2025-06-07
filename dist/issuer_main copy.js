"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const openid4vc_1 = require("@credo-ts/openid4vc");
const issuer_config_1 = require("./issuer_config");
const createOpenId4VcIssuer = async (acmeAgent) => {
    return await acmeAgent.modules.openId4VcIssuer.createIssuer({
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
                vct: "AcmeCorpEmployee",
                id: "AcmeCorpEmployee",
                cryptographic_binding_methods_supported: ["did:key"],
                cryptographic_suites_supported: [core_1.JwaSignatureAlgorithm.ES256],
            },
        ],
    });
};
const createIssuerDid = async (acmeAgent) => {
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
    return issuerDidResult;
};
const createCredentialOfferAndSession = async (acmeAgent, openid4vcIssuer) => {
    return await acmeAgent.modules.openId4VcIssuer.createCredentialOffer({
        issuerId: openid4vcIssuer.issuerId,
        offeredCredentials: ["AcmeCorpEmployee"],
        preAuthorizedCodeFlowConfig: {
            userPinRequired: false,
        },
        issuanceMetadata: {
            someKey: "someValue",
        },
    });
};
const listenForIssuanceSessionEvents = (acmeAgent, issuanceSession) => {
    acmeAgent.events.on(openid4vc_1.OpenId4VcIssuerEvents.IssuanceSessionStateChanged, (event) => {
        if (event.payload.issuanceSession.id === issuanceSession.id) {
            console.log("Issuance session state changed to ", event.payload.issuanceSession.state);
        }
    });
};
const run = async () => {
    console.log("Initializing Acme agent...");
    const acmeAgent = await (0, issuer_config_1.initializeAcmeAgentIssuer)();
    const openid4vcIssuer = await createOpenId4VcIssuer(acmeAgent);
    await createIssuerDid(acmeAgent);
    const { credentialOffer, issuanceSession } = await createCredentialOfferAndSession(acmeAgent, openid4vcIssuer);
    console.log("Credential Offer created:", credentialOffer);
    listenForIssuanceSessionEvents(acmeAgent, issuanceSession);
    return void 0;
};
exports.default = run;
issuer_config_1.app.listen(3000);
void run();
