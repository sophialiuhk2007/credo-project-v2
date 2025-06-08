import {
  JwaSignatureAlgorithm,
  KeyDidCreateOptions,
  KeyType,
} from "@credo-ts/core";
import {
  OpenId4VcIssuerEvents,
  OpenId4VcIssuanceSessionStateChangedEvent,
} from "@credo-ts/openid4vc";
import { initializeAcmeAgentIssuer, app } from "./issuer_config_safe";

const createOpenId4VcIssuer = async (acmeAgent: any) => {
  return await acmeAgent.modules.openId4VcIssuer.createIssuer({
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
    credentialsSupported: [
      {
        format: "vc+sd-jwt",
        vct: "AcmeCorpEmployee",
        id: "AcmeCorpEmployee",
        cryptographic_binding_methods_supported: ["did:key"],
        cryptographic_suites_supported: [JwaSignatureAlgorithm.ES256],
      },
    ],
  });
};

const createIssuerDid = async (acmeAgent: any) => {
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
  return issuerDidResult;
};

const createCredentialOfferAndSession = async (
  acmeAgent: any,
  openid4vcIssuer: any
) => {
  return await acmeAgent.modules.openId4VcIssuer.createCredentialOffer({
    issuerId: openid4vcIssuer.issuerId,
    offeredCredentials: ["AcmeCorpEmployee"],
    preAuthorizedCodeFlowConfig: {
      userPinRequired: false,
    },
    issuanceMetadata: {
      someKey: "someValue",
    },
  });
};

const listenForIssuanceSessionEvents = (
  acmeAgent: any,
  issuanceSession: any
) => {
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
};

const run = async () => {
  console.log("Initializing Acme agent...");
  const acmeAgent = await initializeAcmeAgentIssuer();

  const openid4vcIssuer = await createOpenId4VcIssuer(acmeAgent);
  await createIssuerDid(acmeAgent);

  const { credentialOffer, issuanceSession } =
    await createCredentialOfferAndSession(acmeAgent, openid4vcIssuer);

  console.log("Credential Offer created:", credentialOffer);
  listenForIssuanceSessionEvents(acmeAgent, issuanceSession);

  return void 0;
};

export default run;

app.listen(3000);

void run();
