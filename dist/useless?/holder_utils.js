"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuthorizationRequestViaDidComm = exports.storeCredentials = exports.acceptCredentialOffer = exports.resolveCredentialOffer = void 0;
const core_1 = require("@credo-ts/core");
// Resolve a credential offer from a URL
const resolveCredentialOffer = async (bobAgent, credentialOfferUrl) => {
    return await bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(credentialOfferUrl);
};
exports.resolveCredentialOffer = resolveCredentialOffer;
// Accept a credential offer using pre-authorized code flow
const acceptCredentialOffer = async (bobAgent, resolvedCredentialOffer) => {
    return await bobAgent.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(resolvedCredentialOffer, {
        credentialBindingResolver: async ({ supportedDidMethods, keyType, supportsAllDidMethods, supportsJwk, credentialFormat, }) => {
            if (supportsAllDidMethods || supportedDidMethods?.includes("did:key")) {
                const didResult = await bobAgent.dids.create({
                    method: "key",
                    options: { keyType },
                });
                if (didResult.didState.state !== "finished") {
                    throw new Error("DID creation failed.");
                }
                const didKey = core_1.DidKey.fromDid(didResult.didState.did);
                return {
                    method: "did",
                    didUrl: `${didKey.did}#${didKey.key.fingerprint}`,
                };
            }
            if (supportsJwk && credentialFormat === "vc+sd-jwt") {
                const key = await bobAgent.wallet.createKey({ keyType });
                return {
                    method: "jwk",
                    jwk: (0, core_1.getJwkFromKey)(key),
                };
            }
            throw new Error("Unable to create a key binding");
        },
    });
};
exports.acceptCredentialOffer = acceptCredentialOffer;
// Store received credentials
const storeCredentials = async (bobAgent, credentials) => {
    const records = [];
    for (const credential of credentials) {
        if ("compact" in credential) {
            const record = await bobAgent.sdJwtVc.store(credential.compact);
            records.push(record);
        }
        else {
            const record = await bobAgent.w3cCredentials.storeCredential({
                credential,
            });
            records.push(record);
        }
    }
    return records;
};
exports.storeCredentials = storeCredentials;
// Handle authorization requests received via DIDComm Basic Message
const handleAuthorizationRequestViaDidComm = async (bobAgent, message) => {
    try {
        const authorizationRequest = JSON.parse(message.content);
        const resolvedAuthorizationRequest = await bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(authorizationRequest);
        console.log("Resolved credentials for request (via DIDComm)", JSON.stringify(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest, null, 2));
        const presentationExchangeService = bobAgent.dependencyManager.resolve(core_1.DifPresentationExchangeService);
        const selectedCredentials = presentationExchangeService.selectCredentialsForRequest(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest);
        const authorizationResponse = await bobAgent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest({
            authorizationRequest: resolvedAuthorizationRequest.authorizationRequest,
            presentationExchange: {
                credentials: selectedCredentials,
            },
        });
        console.log("Submitted authorization response (via DIDComm)", JSON.stringify(authorizationResponse.submittedResponse, null, 2));
    }
    catch (e) {
        console.error("Failed to process DIDComm authorization request:", e);
    }
};
exports.handleAuthorizationRequestViaDidComm = handleAuthorizationRequestViaDidComm;
