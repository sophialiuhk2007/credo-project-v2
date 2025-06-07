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
const openid4vc_1 = require("@credo-ts/openid4vc");
const core_1 = require("@credo-ts/core");
const credentialRequestToCredentialMapper = (_a) => __awaiter(void 0, [_a], void 0, function* ({ agentContext, credentialOffer, credentialRequest, credentialsSupported, holderBinding, issuanceSession, }) {
    const firstSupported = credentialsSupported[0];
    if (!firstSupported || !firstSupported.id) {
        throw new Error("No supported credential or credentialSupportedId found");
    }
    // Only support vc+sd-jwt
    if (firstSupported.format !== openid4vc_1.OpenId4VciCredentialFormatProfile.SdJwtVc) {
        throw new Error("Only vc+sd-jwt is supported");
    }
    // Only support AcmeCorpEmployee
    if (firstSupported.vct !== "AcmeCorpEmployee") {
        throw new Error("Only AcmeCorpEmployee is supported");
    }
    // Find the first did:key DID in the wallet
    const didsApi = agentContext.dependencyManager.resolve(core_1.DidsApi);
    const [didKeyDidRecord] = yield didsApi.getCreatedDids({
        method: "key",
    });
    const didKey = core_1.DidKey.fromDid(didKeyDidRecord.did);
    const didUrl = `${didKey.did}#${didKey.key.fingerprint}`;
    return {
        credentialSupportedId: firstSupported.id,
        format: "vc+sd-jwt",
        holder: holderBinding,
        payload: {
            vct: firstSupported.vct,
            firstName: "John",
            lastName: "Doe",
        },
        disclosureFrame: {
            _sd: ["lastName"],
        },
        issuer: {
            method: "did",
            didUrl,
        },
    };
});
exports.default = credentialRequestToCredentialMapper;
