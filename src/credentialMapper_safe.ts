import {
  OpenId4VcIssuanceSessionStateChangedEvent,
  OpenId4VcIssuerEvents,
  OpenId4VcVerificationSessionState,
  OpenId4VcVerificationSessionStateChangedEvent,
  OpenId4VcVerifierEvents,
  OpenId4VciCredentialFormatProfile,
  OpenId4VciCredentialRequestToCredentialMapper,
} from "@credo-ts/openid4vc";

import { DidsApi, DidKey } from "@credo-ts/core";

const credentialRequestToCredentialMapper: OpenId4VciCredentialRequestToCredentialMapper =
  async ({
    agentContext,
    credentialOffer,
    credentialRequest,
    credentialsSupported,
    holderBinding,
    issuanceSession,
  }) => {
    const firstSupported = credentialsSupported[0];

    if (!firstSupported || !firstSupported.id) {
      throw new Error("No supported credential or credentialSupportedId found");
    }

    // Only support vc+sd-jwt
    if (firstSupported.format !== OpenId4VciCredentialFormatProfile.SdJwtVc) {
      throw new Error("Only vc+sd-jwt is supported");
    }

    // Only support AcmeCorpEmployee
    if (firstSupported.vct !== "AcmeCorpEmployee") {
      throw new Error("Only AcmeCorpEmployee is supported");
    }

    // Find the first did:key DID in the wallet
    const didsApi = agentContext.dependencyManager.resolve(DidsApi);
    const [didKeyDidRecord] = await didsApi.getCreatedDids({
      method: "key",
    });

    const didKey = DidKey.fromDid(didKeyDidRecord.did);
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
  };

export default credentialRequestToCredentialMapper;
