"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertValidPinNumber = exports.isPreAuthorizedCodeExpired = exports.createCredentialOfferURIv1_0_11 = exports.createCredentialOfferURI = exports.createCredentialOfferURIFromObject = exports.createCredentialOfferObjectv1_0_11 = exports.createCredentialOfferObject = void 0;
const oid4vc_common_1 = require("@sphereon/oid4vc-common");
const oid4vci_common_1 = require("@sphereon/oid4vci-common");
function createCredentialOfferGrants(inputGrants) {
    var _a, _b;
    // Grants is optional
    if (!inputGrants || Object.keys(inputGrants).length === 0) {
        return undefined;
    }
    const grants = {};
    if (inputGrants === null || inputGrants === void 0 ? void 0 : inputGrants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL]) {
        const grant = Object.assign(Object.assign({}, inputGrants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL]), { 'pre-authorized_code': (_a = inputGrants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL]['pre-authorized_code']) !== null && _a !== void 0 ? _a : (0, oid4vc_common_1.uuidv4)() });
        if (grant.tx_code && !grant.tx_code.length) {
            grant.tx_code.length = 4;
        }
        grants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL] = grant;
    }
    if (inputGrants === null || inputGrants === void 0 ? void 0 : inputGrants.authorization_code) {
        grants.authorization_code = Object.assign(Object.assign({}, inputGrants.authorization_code), { 
            // TODO: it should be possible to create offer without issuer_state
            // this is added to avoid breaking changes.
            issuer_state: (_b = inputGrants.authorization_code.issuer_state) !== null && _b !== void 0 ? _b : (0, oid4vc_common_1.uuidv4)() });
    }
    return grants;
}
function parseCredentialOfferSchemeAndBaseUri(scheme, baseUri, credentialIssuer) {
    var _a;
    const newScheme = (_a = scheme === null || scheme === void 0 ? void 0 : scheme.replace('://', '')) !== null && _a !== void 0 ? _a : ((baseUri === null || baseUri === void 0 ? void 0 : baseUri.includes('://')) ? baseUri.split('://')[0] : 'openid-credential-offer');
    let newBaseUri;
    if (baseUri) {
        newBaseUri = baseUri;
    }
    else if (newScheme.startsWith('http')) {
        if (credentialIssuer) {
            newBaseUri = credentialIssuer;
            if (!newBaseUri.startsWith(`${newScheme}://`)) {
                throw Error(`scheme ${newScheme} is different from base uri ${newBaseUri}`);
            }
        }
        else {
            throw Error(`A '${newScheme}' scheme requires a URI to be present as baseUri`);
        }
    }
    else {
        newBaseUri = '';
    }
    newBaseUri = newBaseUri === null || newBaseUri === void 0 ? void 0 : newBaseUri.replace(`${newScheme}://`, '');
    return { scheme: newScheme, baseUri: newBaseUri };
}
function createCredentialOfferObject(issuerMetadata, 
// todo: probably it's wise to create another builder for CredentialOfferPayload that will generate different kinds of CredentialOfferPayload
opts) {
    if (!issuerMetadata && !(opts === null || opts === void 0 ? void 0 : opts.credentialOffer) && !(opts === null || opts === void 0 ? void 0 : opts.credentialOfferUri)) {
        throw new Error('You have to provide issuerMetadata or credentialOffer object for creating a deeplink');
    }
    const grants = createCredentialOfferGrants(opts === null || opts === void 0 ? void 0 : opts.grants);
    let credential_offer;
    if (opts === null || opts === void 0 ? void 0 : opts.credentialOffer) {
        credential_offer = Object.assign({}, opts.credentialOffer);
    }
    else {
        if (!(issuerMetadata === null || issuerMetadata === void 0 ? void 0 : issuerMetadata.credential_configurations_supported)) {
            throw new Error('credential_configurations_supported is mandatory in the metadata');
        }
        credential_offer = {
            credential_issuer: issuerMetadata.credential_issuer,
            credential_configuration_ids: Object.keys(issuerMetadata.credential_configurations_supported),
        };
    }
    if (grants) {
        credential_offer.grants = grants;
    }
    // todo: check payload against issuer metadata. Especially strings in the credentials array: When processing, the Wallet MUST resolve this string value to the respective object.
    return { credential_offer, credential_offer_uri: opts === null || opts === void 0 ? void 0 : opts.credentialOfferUri };
}
exports.createCredentialOfferObject = createCredentialOfferObject;
function createCredentialOfferObjectv1_0_11(issuerMetadata, 
// todo: probably it's wise to create another builder for CredentialOfferPayload that will generate different kinds of CredentialOfferPayload
opts) {
    var _a, _b, _c;
    if (!issuerMetadata && !(opts === null || opts === void 0 ? void 0 : opts.credentialOffer) && !(opts === null || opts === void 0 ? void 0 : opts.credentialOfferUri)) {
        throw new Error('You have to provide issuerMetadata or credentialOffer object for creating a deeplink');
    }
    // v13 to v11 grant
    const grants = createCredentialOfferGrants(opts === null || opts === void 0 ? void 0 : opts.grants);
    if ((_a = grants === null || grants === void 0 ? void 0 : grants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL]) === null || _a === void 0 ? void 0 : _a.tx_code) {
        const _d = grants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL], { tx_code } = _d, rest = __rest(_d, ["tx_code"]);
        grants[oid4vci_common_1.PRE_AUTH_GRANT_LITERAL] = Object.assign({ user_pin_required: true }, rest);
    }
    let credential_offer;
    if (opts === null || opts === void 0 ? void 0 : opts.credentialOffer) {
        credential_offer = Object.assign(Object.assign({}, opts.credentialOffer), { credentials: (_c = (_b = opts.credentialOffer) === null || _b === void 0 ? void 0 : _b.credentials) !== null && _c !== void 0 ? _c : issuerMetadata === null || issuerMetadata === void 0 ? void 0 : issuerMetadata.credentials_supported.map((s) => s.id).filter((i) => i !== undefined) });
    }
    else {
        if (!issuerMetadata) {
            throw new Error('Issuer metadata is required when no credential offer is provided');
        }
        credential_offer = {
            credential_issuer: issuerMetadata.credential_issuer,
            credentials: issuerMetadata === null || issuerMetadata === void 0 ? void 0 : issuerMetadata.credentials_supported.map((s) => s.id).filter((i) => i !== undefined),
        };
    }
    return { credential_offer, credential_offer_uri: opts === null || opts === void 0 ? void 0 : opts.credentialOfferUri };
}
exports.createCredentialOfferObjectv1_0_11 = createCredentialOfferObjectv1_0_11;
function createCredentialOfferURIFromObject(credentialOffer, opts) {
    var _a;
    const { scheme, baseUri } = parseCredentialOfferSchemeAndBaseUri(opts === null || opts === void 0 ? void 0 : opts.scheme, opts === null || opts === void 0 ? void 0 : opts.baseUri, (_a = credentialOffer.credential_offer) === null || _a === void 0 ? void 0 : _a.credential_issuer);
    if (credentialOffer.credential_offer_uri) {
        if (credentialOffer.credential_offer_uri.includes('credential_offer_uri=')) {
            // discard the scheme. Apparently a URI is set and it already contains the actual uri, so assume that takes priority
            return credentialOffer.credential_offer_uri;
        }
        return `${scheme}://${baseUri}?credential_offer_uri=${encodeURIComponent(credentialOffer.credential_offer_uri)}`;
    }
    return `${scheme}://${baseUri}?credential_offer=${encodeURIComponent(JSON.stringify(credentialOffer.credential_offer))}`;
}
exports.createCredentialOfferURIFromObject = createCredentialOfferURIFromObject;
function createCredentialOfferURI(issuerMetadata, 
// todo: probably it's wise to create another builder for CredentialOfferPayload that will generate different kinds of CredentialOfferPayload
opts) {
    const credentialOffer = createCredentialOfferObject(issuerMetadata, opts);
    return createCredentialOfferURIFromObject(credentialOffer, opts);
}
exports.createCredentialOfferURI = createCredentialOfferURI;
function createCredentialOfferURIv1_0_11(issuerMetadata, 
// todo: probably it's wise to create another builder for CredentialOfferPayload that will generate different kinds of CredentialOfferPayload
opts) {
    const credentialOffer = createCredentialOfferObjectv1_0_11(issuerMetadata, opts);
    return createCredentialOfferURIFromObject(credentialOffer, opts);
}
exports.createCredentialOfferURIv1_0_11 = createCredentialOfferURIv1_0_11;
const isPreAuthorizedCodeExpired = (state, expirationDurationInSeconds) => {
    const now = +new Date();
    const expirationTime = state.createdAt + expirationDurationInSeconds * 1000;
    return now >= expirationTime;
};
exports.isPreAuthorizedCodeExpired = isPreAuthorizedCodeExpired;
const assertValidPinNumber = (pin, pinLength) => {
    if (pin && !RegExp(`[\\d\\D]{${pinLength !== null && pinLength !== void 0 ? pinLength : 6}}`).test(pin)) {
        throw Error(`${oid4vci_common_1.PIN_NOT_MATCH_ERROR}`);
    }
};
exports.assertValidPinNumber = assertValidPinNumber;
//# sourceMappingURL=CredentialOfferUtils.js.map