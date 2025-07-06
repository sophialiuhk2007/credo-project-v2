import express, { Request, Response } from "express";
// Assume verifier_main exports a function called verifyCredential
// Assume generatePkpass is a function that creates a pkpass file/buffer
import { generatePkpassFromTemplate } from "./utils/generatePkpass"; // <-- create this utility
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
import {
  OpenId4VcVerifierModule,
  OpenId4VcVerifierEvents,
  OpenId4VcVerificationSessionStateChangedEvent,
  OpenId4VcVerificationSessionState,
} from "@credo-ts/openid4vc";
import { getTemplateById } from "./template_manager";

const app = express();
const verifierRouter = express.Router();
app.use("/oid4vci", verifierRouter);

const verificationSessions: Record<
  string,
  { state: string; result?: any; pkpass?: Buffer; error?: string }
> = {};

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
            id: "12345",
            name: "Any Credential",
            purpose: "PKPASS generation",
            input_descriptors: [
              {
                id: "23456",
                constraints: {
                  // Require limit disclosure
                  limit_disclosure: "preferred",
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

let acmeVerifierAgent: Agent | null = null;

const startServer = async () => {
  acmeVerifierAgent = await initializeAcmeVerifierAgent();
  app.listen(3003, () => {
    console.log("Server listening on port 3003");
  });
};

verifierRouter.get("/request-pkpass", (_req, res) => {
  (async () => {
    try {
      if (!acmeVerifierAgent) {
        res.status(500).json({ error: "Agent not initialized" });
        return;
      }
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
          const sessionId = event.payload.verificationSession.id;
          verificationSessions[sessionId] = {
            state: event.payload.verificationSession.state,
          };

          if (
            event.payload.verificationSession.state ===
            OpenId4VcVerificationSessionState.ResponseVerified
          ) {
            if (acmeVerifierAgent) {
              const verifiedAuthorizationResponse =
                await acmeVerifierAgent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(
                  sessionId
                );

              // Extract the credential from the verified response
              const credential =
                verifiedAuthorizationResponse?.verifiablePresentation
                  ?.verifiableCredential?.[0];
              console.log(
                "Successfully verified presentation.",
                JSON.stringify(verifiedAuthorizationResponse, null, 2)
              );

              if (credential) {
                const template = {
                  id: "AcmeFamilyCertificate",
                  name: "Acme Family Certificate",
                  description: "Certificate for ACME Family Members",
                  vct: "AcmeFamilyCertificate",
                  fields: [
                    {
                      name: "iD",
                      label: "iD",
                      type: "text",
                      description: "",
                      required: false,
                      selectivelyDisclosable: false,
                    },
                  ],
                  pkpass: {
                    thumbnailBase64:
                      "iVBORw0KGgoAAAANSUhEUgAAAGgAAADABAMAAAAafTsRAAAAD1BMVEUAAAAwLyahsF/B0nH///8GCACaAAAAAXRSTlMAQObYZgAAAmpJREFUaN7d2utRwzAMAGDpjgEk6AIYFgBnARPvPxMxhZKHH5KSNAH/6vX6nSTHTlLbAPnG10Ygb/zbpASZ1WpqZGpuJGppBCpjmn2YC9RSedNIsIRIW1ErFBYRGQJVQmEFkSFQMRRuj8iQXSlUA5E+uwJiNuTXRLQRQjbkdz/EOyE6DuEK5P2boieu6Ml7r0ZuGzTJt4BeZmiabx49DmqCUui38pD4Ru5ZjQY1LSnl20Tz5tw4thAN+brKMMdSqGc9qk8o5DNNXQsy3fjoyPtyOz/YCu2SHW+FLBcXz/QAYMt0YkugRX4WhBbEsrYeoRCRIdB6JM1uUpQJsQHJA42KqqOYRzVyiT6GXH410w9P6i6Datkl432woG5ZVAVdfOe7OA5FkpKi77teibqYWr8o6pZdyHV4HJL7igRy9NKnSAnFCbr9IJee6z6ce39NKIjRQFx0r+ljGPdEDXFCA5sjrKJLMik7Jjni+B2ogEJhZsQ4nSKTSxsa8+/+iHZHl1+EchRuReHiOw3i5t3vCMR6RBpEGRQMqNnlo6t7TvTTVSoUlgh3QfxXEO6N4hI1r9NtSFgQ2RDcD6EagRGBAgUzGj8/dQiUaPyeQzoElkjXUBBliEYvpJJX+i+k/rO2RCBCZEFgQKRH0bJGFS3rBA9HLn3AedB22yEmBHsgyw7U4QgM/fC3kWVPkvZEYEAEkpK2QShBeBCC1YhOiECCFuPmvyGQovkQwHUI9kNkRiBBsBLNQt8NyY6/kOJgFG6CUINmX8DmCAoL40qEzZIA8ov9JDlFNd/AEJ3Xmm2VyA55gbIh607T/aiG+QQlAto8jN0W1AAAAABJRU5ErkJggg==",
                    primary: [
                      {
                        type: "primary",
                        label: "id",
                        value: {
                          type: "field",
                          value: "iD",
                        },
                      },
                    ],
                    secondary: [],
                    auxiliary: [],
                    backgroundColor: "#ffffff",
                    textColor: "#000000",
                    logoText: "123",
                    description: "123",
                  },
                };
                const pkpassBuffer = await generatePkpassFromTemplate(
                  template,
                  credential
                );

                // Store pkpass buffer in the session for download
                verificationSessions[sessionId] = {
                  state: event.payload.verificationSession.state,
                  result: verifiedAuthorizationResponse,
                  pkpass: pkpassBuffer,
                };
              } else {
                verificationSessions[sessionId] = {
                  state: event.payload.verificationSession.state,
                  result: verifiedAuthorizationResponse,
                  error: "No credential found in the response",
                };
              }
            } else {
              console.error(
                "acmeVerifierAgent is null when handling verification session state change."
              );
            }
          }
        }
      );

      res.json({
        authorizationRequest,
        verificationSessionId: verificationSession.id,
      });
    } catch (error) {
      console.error("Error in /request-pkpass:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
});

app.use(verifierRouter);

startServer();
