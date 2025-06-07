import { AssertedUniformCredentialOffer, CredentialIssuerMetadataOpts, CredentialIssuerMetadataOptsV1_0_13, CredentialIssuerMetadataV1_0_11, CredentialOfferPayloadV1_0_11, CredentialOfferPayloadV1_0_13, CredentialOfferSession, CredentialOfferV1_0_13, GrantAuthorizationCode, GrantUrnIetf, IssuerMetadataV1_0_13, PRE_AUTH_GRANT_LITERAL, UniformCredentialOffer } from '@sphereon/oid4vci-common';
export interface CredentialOfferGrantInput {
    authorization_code?: Partial<GrantAuthorizationCode>;
    [PRE_AUTH_GRANT_LITERAL]?: Partial<GrantUrnIetf>;
}
export declare function createCredentialOfferObject(issuerMetadata?: CredentialIssuerMetadataOptsV1_0_13, opts?: {
    credentialOffer?: CredentialOfferPayloadV1_0_13;
    credentialOfferUri?: string;
    grants?: CredentialOfferGrantInput;
}): AssertedUniformCredentialOffer;
export declare function createCredentialOfferObjectv1_0_11(issuerMetadata?: CredentialIssuerMetadataOpts, opts?: {
    credentialOffer?: CredentialOfferPayloadV1_0_11;
    credentialOfferUri?: string;
    scheme?: string;
    baseUri?: string;
    grants?: CredentialOfferGrantInput;
}): AssertedUniformCredentialOffer;
export declare function createCredentialOfferURIFromObject(credentialOffer: CredentialOfferV1_0_13 | UniformCredentialOffer, opts?: {
    scheme?: string;
    baseUri?: string;
}): string;
export declare function createCredentialOfferURI(issuerMetadata?: IssuerMetadataV1_0_13, opts?: {
    credentialOffer?: CredentialOfferPayloadV1_0_13;
    credentialOfferUri?: string;
    scheme?: string;
    baseUri?: string;
    grants?: CredentialOfferGrantInput;
}): string;
export declare function createCredentialOfferURIv1_0_11(issuerMetadata?: CredentialIssuerMetadataV1_0_11, opts?: {
    credentialOffer?: CredentialOfferPayloadV1_0_11;
    credentialOfferUri?: string;
    scheme?: string;
    baseUri?: string;
    grants?: CredentialOfferGrantInput;
}): string;
export declare const isPreAuthorizedCodeExpired: (state: CredentialOfferSession, expirationDurationInSeconds: number) => boolean;
export declare const assertValidPinNumber: (pin?: string, pinLength?: number) => void;
//# sourceMappingURL=CredentialOfferUtils.d.ts.map