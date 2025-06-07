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
const readline_1 = __importDefault(require("readline"));
const holder_init_1 = require("./holder_init");
const core_1 = require("@credo-ts/core");
const openid4vc_1 = require("@credo-ts/openid4vc");
// Resolves the credential offer from a URL
const resolveCredentialOffer = (bobAgent, credentialOfferUrl) => __awaiter(void 0, void 0, void 0, function* () {
    return yield bobAgent.modules.openId4VcHolderModule.resolveCredentialOffer(credentialOfferUrl);
});
// Accepts the credential offer using pre-authorized code flow
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
            if (supportsJwk &&
                credentialFormat === openid4vc_1.OpenId4VciCredentialFormatProfile.SdJwtVc) {
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
// Stores the received credentials
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
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const bobAgent = yield (0, holder_init_1.initializeBobAgent)();
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const question = (q) => new Promise((res) => rl.question(q, res));
    const credentialOfferUrl = yield question("Enter the credential offer URL: ");
    rl.close();
    const resolvedCredentialOffer = yield resolveCredentialOffer(bobAgent, credentialOfferUrl);
    console.log("Resolved credential offer", JSON.stringify(resolvedCredentialOffer.credentialOfferPayload, null, 2));
    const credentials = yield acceptCredentialOffer(bobAgent, resolvedCredentialOffer);
    console.log("Received credentials", JSON.stringify(credentials, null, 2));
    const records = yield storeCredentials(bobAgent, credentials);
});
exports.default = run;
void run();
