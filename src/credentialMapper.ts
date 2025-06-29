import {
  OpenId4VciCredentialFormatProfile,
  OpenId4VciCredentialRequestToCredentialMapper,
} from "@credo-ts/openid4vc";
import { DidsApi, DidKey } from "@credo-ts/core";
import { sessionDataMap } from "./issuer_main";
import { generatePkpassFromTemplate } from "./utils/generatePkpass"; // <-- Import your pkpass generator

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

    if (firstSupported.format !== OpenId4VciCredentialFormatProfile.SdJwtVc) {
      throw new Error("Only vc+sd-jwt is supported");
    }

    let payloadFields: Record<string, any> = {};
    let template: any = null;

    // Get session data and template
    if (
      issuanceSession?.metadata?.data &&
      Object.keys(issuanceSession.metadata.data).length > 0
    ) {
      payloadFields = { ...issuanceSession.metadata.data };
    } else if (issuanceSession?.id && sessionDataMap.has(issuanceSession.id)) {
      const sessionData = sessionDataMap.get(issuanceSession.id);
      payloadFields = { ...sessionData.data };
      template = sessionData.template;
      console.log("Loaded session data and template:", {
        payloadFields,
        template,
      });

      sessionDataMap.delete(issuanceSession.id);
    }

    // Always include vct
    payloadFields.vct = firstSupported.vct;

    // Determine which fields should be selectively disclosable based on template
    let selectivelyDisclosableFields: string[] = [];

    if (template && template.fields) {
      selectivelyDisclosableFields = template.fields
        .filter(
          (field: any) => field.selectivelyDisclosable && field.name !== "vct"
        )
        .map((field: any) => field.name);

      console.log(
        "Selectively disclosable fields:",
        selectivelyDisclosableFields
      );
    } else {
      // Fallback: make all fields except vct selectively disclosable
      selectivelyDisclosableFields = Object.keys(payloadFields).filter(
        (k) => k !== "vct"
      );
    }

    // Find the first did:key DID in the wallet
    const didsApi = agentContext.dependencyManager.resolve(DidsApi);
    const [didKeyDidRecord] = await didsApi.getCreatedDids({
      method: "key",
    });

    const didKey = DidKey.fromDid(didKeyDidRecord.did);
    const didUrl = `${didKey.did}#${didKey.key.fingerprint}`;

    // --- Add pkpass to the credential payload ---
    if (template) {
      try {
        const pkpassBuffer = await generatePkpassFromTemplate(
          template,
          payloadFields
        );
        payloadFields.pkpass = pkpassBuffer.toString("base64");
      } catch (e) {
        console.error("Failed to generate pkpass, skipping pkpass field:", e);
      }
    }

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
export default credentialRequestToCredentialMapper;
