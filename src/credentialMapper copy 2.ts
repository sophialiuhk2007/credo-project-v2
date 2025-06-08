import {
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
    console.log("Mapper session id:", issuanceSession?.id);
    const firstSupported = credentialsSupported[0];

    if (!firstSupported || !firstSupported.id) {
      throw new Error("No supported credential or credentialSupportedId found");
    }

    // Only support vc+sd-jwt
    if (firstSupported.format !== OpenId4VciCredentialFormatProfile.SdJwtVc) {
      throw new Error("Only vc+sd-jwt is supported");
    }

    // --- Extract user-inputted fields from issuanceSession.metadata or credentialRequest.claims ---
    let payloadFields: Record<string, any> = {};
    console.log("Mapper received data:", issuanceSession?.metadata?.data);
    // Prefer issuanceSession.metadata.data (set in your backend when creating the offer)
    if (issuanceSession?.metadata?.data) {
      payloadFields = { ...issuanceSession.metadata.data };
    }

    // Always include vct
    payloadFields.vct = firstSupported.vct;

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

export default credentialRequestToCredentialMapper;
