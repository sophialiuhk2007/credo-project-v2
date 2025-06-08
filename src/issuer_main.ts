import { JwaSignatureAlgorithm, KeyType } from "@credo-ts/core";
import {
  OpenId4VcIssuerEvents,
  OpenId4VcIssuanceSessionStateChangedEvent,
} from "@credo-ts/openid4vc";
import { initializeAcmeAgentIssuer, issuerRouter } from "./issuer_config";
import { getAllTemplates } from "./template_manager";

// Hold initialized agent and issuer globally
let acmeAgent: any = null;
let openid4vcIssuer: any = null;

// Workaround: Store session data separately
const sessionDataMap = new Map<string, any>();

// Initialize agent, issuer, and DID on server startup
export const initializeIssuer = async () => {
  console.log("Initializing issuer...");
  acmeAgent = await initializeAcmeAgentIssuer();

  const templates = getAllTemplates();
  const credentialsSupported = templates.map((template) => ({
    format: "vc+sd-jwt",
    vct: template.vct,
    id: template.id,
    cryptographic_binding_methods_supported: ["did:key"],
    cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
  }));

  openid4vcIssuer = await acmeAgent.modules.openId4VcIssuer.createIssuer({
    display: [
      {
        name: "ACME Corp.",
        description: "ACME Corp. is a company that provides the best services.",
        text_color: "#000000",
        background_color: "#FFFFFF",
        logo: {
          url: "https://static.vecteezy.com/system/resources/previews/053/547/120/non_2x/generic-user-profile-avatar-for-online-platforms-and-social-media-vector.jpg",
          alt_text: "ACME Corp. logo",
        },
      },
    ],
    credentialsSupported,
  });

  const issuerDidResult = await acmeAgent.dids.create({
    method: "key",
    options: {
      keyType: KeyType.Ed25519,
    },
  });

  if (issuerDidResult.didState.state !== "finished") {
    throw new Error("DID creation failed.");
  } else {
    console.log(
      "Issuer DID created successfully:",
      issuerDidResult.didState.did
    );
  }
};

// Only called when issuing a credential
export const issueCredentialOffer = async (
  data?: Record<string, any>,
  templateId?: string
) => {
  console.log("Passing issuanceMetadata.data:", data);
  if (!acmeAgent || !openid4vcIssuer) {
    throw new Error("Issuer not initialized");
  }

  const { credentialOffer, issuanceSession } =
    await acmeAgent.modules.openId4VcIssuer.createCredentialOffer({
      issuerId: openid4vcIssuer.issuerId,
      offeredCredentials: [templateId],
      preAuthorizedCodeFlowConfig: {
        userPinRequired: false,
      },
      issuanceMetadata: {
        data,
      },
    });

  console.log("Offer session id:", issuanceSession.id);

  // Workaround: Store data by session ID
  if (data && issuanceSession.id) {
    sessionDataMap.set(issuanceSession.id, data);
    console.log(
      "Stored data in sessionDataMap for session:",
      issuanceSession.id
    );
  }

  // Listen for session events
  acmeAgent.events.on(
    OpenId4VcIssuerEvents.IssuanceSessionStateChanged,
    (event: OpenId4VcIssuanceSessionStateChangedEvent) => {
      if (event.payload.issuanceSession.id === issuanceSession.id) {
        console.log(
          "Issuance session state changed to ",
          event.payload.issuanceSession.state
        );
      }
    }
  );

  return { credentialOffer, issuanceSession };
};

export { sessionDataMap };
