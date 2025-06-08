"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const openid4vc_1 = require("@credo-ts/openid4vc");
const core_1 = require("@credo-ts/core");
const issuer_main_1 = require("./issuer_main");
const credentialRequestToCredentialMapper = async ({ agentContext, credentialOffer, credentialRequest, credentialsSupported, holderBinding, issuanceSession, }) => {
    const firstSupported = credentialsSupported[0];
    if (!firstSupported || !firstSupported.id) {
        throw new Error("No supported credential or credentialSupportedId found");
    }
    if (firstSupported.format !== openid4vc_1.OpenId4VciCredentialFormatProfile.SdJwtVc) {
        throw new Error("Only vc+sd-jwt is supported");
    }
    let payloadFields = {};
    let template = null;
    // Get session data and template
    if (issuanceSession?.metadata?.data &&
        Object.keys(issuanceSession.metadata.data).length > 0) {
        payloadFields = { ...issuanceSession.metadata.data };
    }
    else if (issuanceSession?.id && issuer_main_1.sessionDataMap.has(issuanceSession.id)) {
        const sessionData = issuer_main_1.sessionDataMap.get(issuanceSession.id);
        payloadFields = { ...sessionData.data };
        template = sessionData.template;
        console.log("Loaded session data and template:", {
            payloadFields,
            template,
        });
        issuer_main_1.sessionDataMap.delete(issuanceSession.id);
    }
    // Always include vct
    payloadFields.vct = firstSupported.vct;
    // Determine which fields should be selectively disclosable based on template
    let selectivelyDisclosableFields = [];
    if (template && template.fields) {
        selectivelyDisclosableFields = template.fields
            .filter((field) => field.selectivelyDisclosable && field.name !== "vct")
            .map((field) => field.name);
        console.log("Selectively disclosable fields:", selectivelyDisclosableFields);
    }
    else {
        // Fallback: make all fields except vct selectively disclosable
        selectivelyDisclosableFields = Object.keys(payloadFields).filter((k) => k !== "vct");
    }
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
            _sd: selectivelyDisclosableFields, // Use template-defined selective disclosure
        },
        issuer: {
            method: "did",
            didUrl,
        },
    };
};
exports.default = credentialRequestToCredentialMapper;
