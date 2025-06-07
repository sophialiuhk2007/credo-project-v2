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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuthorizationRequestViaDidComm = exports.storeCredentials = exports.acceptCredentialOffer = exports.resolveCredentialOffer = void 0;
const core_1 = require("@credo-ts/core");
// Resolve a credential offer from a URL
const resolveCredentialOffer = (bobAgent, credentialOfferUrl) => __awaiter(void 0, void 0, void 0, function* () {
    return yield bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(credentialOfferUrl);
});
exports.resolveCredentialOffer = resolveCredentialOffer;
// Accept a credential offer using pre-authorized code flow
const acceptCredentialOffer = (bobAgent, resolvedCredentialOffer) => __awaiter(void 0, void 0, void 0, function* () {
    return yield bobAgent.modules.openId4VcHolderModule.acceptCredentialOfferUsingPreAuthorizedCode(resolvedCredentialOffer, {
        credentialBindingResolver: (_a) => __awaiter(void 0, [_a], void 0, function* ({ supportedDidMethods, keyType, supportsAllDidMethods, supportsJwk, credentialFormat, }) {
            if (supportsAllDidMethods || (supportedDidMethods === null || supportedDidMethods === void 0 ? void 0 : supportedDidMethods.includes("did:key"))) {
                const didResult = yield bobAgent.dids.create({
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
                const key = yield bobAgent.wallet.createKey({ keyType });
                return {
                    method: "jwk",
                    jwk: (0, core_1.getJwkFromKey)(key),
                };
            }
            throw new Error("Unable to create a key binding");
        }),
    });
});
exports.acceptCredentialOffer = acceptCredentialOffer;
// Store received credentials
const storeCredentials = (bobAgent, credentials) => __awaiter(void 0, void 0, void 0, function* () {
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
    return records;
});
exports.storeCredentials = storeCredentials;
// Handle authorization requests received via DIDComm Basic Message
const handleAuthorizationRequestViaDidComm = (bobAgent, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authorizationRequest = JSON.parse(message.content);
        const resolvedAuthorizationRequest = yield bobAgent.modules.openId4VcHolderModule.resolveSiopAuthorizationRequest(authorizationRequest);
        console.log("Resolved credentials for request (via DIDComm)", JSON.stringify(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest, null, 2));
        const presentationExchangeService = bobAgent.dependencyManager.resolve(core_1.DifPresentationExchangeService);
        const selectedCredentials = presentationExchangeService.selectCredentialsForRequest(resolvedAuthorizationRequest.presentationExchange.credentialsForRequest);
        const authorizationResponse = yield bobAgent.modules.openId4VcHolderModule.acceptSiopAuthorizationRequest({
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
});
exports.handleAuthorizationRequestViaDidComm = handleAuthorizationRequestViaDidComm;
