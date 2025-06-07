"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline_1 = __importDefault(require("readline"));
const holder_init_1 = require("./holder_init");
const core_1 = require("@credo-ts/core");
const openid4vc_1 = require("@credo-ts/openid4vc");
// Resolves the credential offer from a URL
const resolveCredentialOffer = async (bobAgent, credentialOfferUrl) => {
    return await bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(credentialOfferUrl);
};
// Accepts the credential offer using pre-authorized code flow
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
            if (supportsJwk &&
                credentialFormat === openid4vc_1.OpenId4VciCredentialFormatProfile.SdJwtVc) {
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
// Stores the received credentials
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
const run = async () => {
    const bobAgent = await (0, holder_init_1.initializeBobAgent)();
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (q) => new Promise((res) => rl.question(q, res));
    const credentialOfferUrl = await question("Enter the credential offer URL: ");
    rl.close();
    const resolvedCredentialOffer = await resolveCredentialOffer(bobAgent, credentialOfferUrl);
    console.log("Resolved credential offer", JSON.stringify(resolvedCredentialOffer.credentialOfferPayload, null, 2));
    const credentials = await acceptCredentialOffer(bobAgent, resolvedCredentialOffer);
    console.log("Received credentials", JSON.stringify(credentials, null, 2));
    const records = await storeCredentials(bobAgent, credentials);
};
exports.default = run;
void run();
