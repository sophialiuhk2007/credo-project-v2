import type { InitConfig } from "@credo-ts/core";
import {
  Agent,
  KeyDerivationMethod,
  ConsoleLogger,
  LogLevel,
  DidCommMimeType,
  HttpOutboundTransport,
  WsOutboundTransport,
  ConnectionStateChangedEvent,
  ConnectionEventTypes,
  DidExchangeState,
  OutOfBandRecord,
  JwaSignatureAlgorithm,
  KeyDidCreateOptions,
  KeyType,
  DidKey,
  BasicMessagesModule,
} from "@credo-ts/core";
import { agentDependencies, HttpInboundTransport } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import express, { Router } from "express";
import {
  OpenId4VcIssuerModule,
  OpenId4VcVerifierModule,
  OpenId4VcVerifierEvents,
  OpenId4VcVerificationSessionStateChangedEvent,
  OpenId4VcVerificationSessionState,
} from "@credo-ts/openid4vc";

const verifierRouter = Router();
const app = express();
app.use("/oid4vci", verifierRouter);

const initializeAcmeVerifierAgent = async () => {
  const config: InitConfig = {
    label: "verifier-agent",
    walletConfig: {
      id: "mainAcmeVerifierWallet",
      key: "demoagentverifieracme0000000000000000000",
      keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
    },
    endpoints: ["http://localhost:3002"],
    logger: new ConsoleLogger(LogLevel.info),
    didCommMimeType: DidCommMimeType.V1,
    useDidKeyInProtocols: true,
    connectionImageUrl:
      "https://static.vecteezy.com/system/resources/previews/053/547/120/non_2x/generic-user-profile-avatar-for-online-platforms-and-social-media-vector.jpg",
    autoUpdateStorageOnStartup: true,
  };

  const agent = new Agent({
    config,
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        ariesAskar,
      }),
      openId4VcVerifier: new OpenId4VcVerifierModule({
        baseUrl: "http://127.0.0.1:3003/oid4vci/",
        router: verifierRouter,
      }),
      basicMessages: new BasicMessagesModule(),
    },
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3002 })); //avoid conflict with app

  await agent.initialize();

  return agent;
};

const createNewInvitation = async (agent: Agent) => {
  const outOfBandRecord = await agent.oob.createInvitation();

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "http://localhost:3002",
    }),
    outOfBandRecord,
  };
};

const createAuthorizationRequestAndSession = async (
  acmeVerifierAgent: Agent,
  openId4VcVerifier: any
) => {
  // Create a did:key that we will use for signing OpenID4VP authorization requests
  const verifierDidResult =
    await acmeVerifierAgent.dids.create<KeyDidCreateOptions>({
      method: "key",
      options: {
        keyType: KeyType.Ed25519,
      },
    });

  if (verifierDidResult.didState.state !== "finished") {
    throw new Error("DID creation failed.");
  }

  const verifierDidKey = DidKey.fromDid(verifierDidResult.didState.did);

  const { authorizationRequest, verificationSession } =
    await acmeVerifierAgent.modules.openId4VcVerifier.createAuthorizationRequest(
      {
        verifierId: openId4VcVerifier.verifierId,
        requestSigner: {
          didUrl: `${verifierDidKey.did}#${verifierDidKey.key.fingerprint}`,
          method: "did",
        },
        // Add DIF presentation exchange data
        presentationExchange: {
          definition: {
            id: "9ed05140-b33b-445e-a0f0-9a23aa501868",
            name: "Employee Verification",
            purpose:
              "We need to verify your employee status to grant access to the employee portal",
            input_descriptors: [
              {
                id: "9c98fb43-6fd5-49b1-8dcc-69bd2a378f23",
                constraints: {
                  // Require limit disclosure
                  limit_disclosure: "required",
                  fields: [
                    {
                      filter: {
                        type: "string",
                        const: "AcmeCorpEmployee",
                      },
                      path: ["$.vct"],
                    },
                  ],
                },
              },
            ],
          },
        },
      }
    );

  return { authorizationRequest, verificationSession };
};

const run = async () => {
  console.log("Initializing Acme Verifier agent...");
  const acmeVerifierAgent = await initializeAcmeVerifierAgent();
  const openId4VcVerifier =
    await acmeVerifierAgent.modules.openId4VcVerifier.createVerifier({});
  const { authorizationRequest, verificationSession } =
    await createAuthorizationRequestAndSession(
      acmeVerifierAgent,
      openId4VcVerifier
    );

  console.log(
    "Created OpenID4VC authorization request",
    JSON.stringify(authorizationRequest, null, 2)
  );

  // Listen for verification session state changes
  acmeVerifierAgent.events.on<OpenId4VcVerificationSessionStateChangedEvent>(
    OpenId4VcVerifierEvents.VerificationSessionStateChanged,
    async (event) => {
      if (event.payload.verificationSession.id === verificationSession.id) {
        console.log(
          "Verification session state changed to ",
          event.payload.verificationSession.state
        );
      }

      if (
        event.payload.verificationSession.state ===
        OpenId4VcVerificationSessionState.ResponseVerified
      ) {
        const verifiedAuthorizationResponse =
          await acmeVerifierAgent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(
            verificationSession.id
          );
        console.log(
          "Successfully verified presentation.",
          JSON.stringify(verifiedAuthorizationResponse, null, 2)
        );

        console.log("Exiting...");
        process.exit();
      }
    }
  );
  app.listen(3003);
};

export default run;

void run();
