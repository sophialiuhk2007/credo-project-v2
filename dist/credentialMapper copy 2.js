"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openid4vc_1 = require("@credo-ts/openid4vc");
const core_1 = require("@credo-ts/core");
const credentialRequestToCredentialMapper = async ({ agentContext, credentialOffer, credentialRequest, credentialsSupported, holderBinding, issuanceSession, }) => {
    console.log("Mapper session id:", issuanceSession?.id);
    const firstSupported = credentialsSupported[0];
    if (!firstSupported || !firstSupported.id) {
        throw new Error("No supported credential or credentialSupportedId found");
    }
    // Only support vc+sd-jwt
    if (firstSupported.format !== openid4vc_1.OpenId4VciCredentialFormatProfile.SdJwtVc) {
        throw new Error("Only vc+sd-jwt is supported");
    }
    // --- Extract user-inputted fields from issuanceSession.metadata or credentialRequest.claims ---
    let payloadFields = {};
    console.log("Mapper received data:", issuanceSession?.metadata?.data);
    // Prefer issuanceSession.metadata.data (set in your backend when creating the offer)
    if (issuanceSession?.metadata?.data) {
        payloadFields = { ...issuanceSession.metadata.data };
    }
    // Always include vct
    payloadFields.vct = firstSupported.vct;
    // Find the first did:key DID in the wallet
    const didsApi = agentContext.dependencyManager.resolve(core_1.DidsApi);
    const [didKeyDidRecord] = await didsApi.getCreatedDids({
        method: "key",
    });
    const didKey = core_1.DidKey.fromDid(didKeyDidRecord.did);
    const didUrl = `${didKey.did}#${didKey.key.fingerprint}`;
    return {
        credentialSupportedId: firstSupported.id,
        format: "vc+sd-jwt",
        holder: holderBinding,
        payload: payloadFields,
        disclosureFrame: {
            _sd: Object.keys(payloadFields).filter((k) => k !== "vct"),
        },
        issuer: {
            method: "did",
            didUrl,
        },
    };
};
exports.default = credentialRequestToCredentialMapper;
