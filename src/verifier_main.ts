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
require("dotenv").config();

export const verifierRouter = Router();
let storeVerificationResult: (
  sessionId: string,
  result: any
) => void = () => {};

export function setStoreVerificationResult(fn: typeof storeVerificationResult) {
  storeVerificationResult = fn;
}

export let verifierAgent: Agent | undefined;

export const initializeAcmeVerifierAgent = async () => {
  const config: InitConfig = {
    label: "verifier-agent",
    walletConfig: {
      id: "mainAcmeVerifierWallet",
      key:
        process.env.VERIFIER_WALLET_KEY ??
        (() => {
          throw new Error(
            "VERIFIER_WALLET_KEY environment variable is not set"
          );
        })(),
      keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
    },
    endpoints: ["http://0.0.0.0:3002"],
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
        baseUrl: "https://trustinc.fly.dev/oid4vci/verifier/",
        router: verifierRouter, // <-- this is required!
      }),
      basicMessages: new BasicMessagesModule(),
    },
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3002 })); //avoid conflict with app

  await agent.initialize();

  verifierAgent = agent;
  return agent;
};

export const createAuthorizationRequestAndSession = async (
  acmeVerifierAgent: Agent,
  openId4VcVerifier: any,
  presentationExchange: any
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
        presentationExchange,
      }
    );

  return { authorizationRequest, verificationSession };
};

export function monitorVerificationSession(
  agent: Agent,
  verificationSessionId: string
) {
  agent.events.on<OpenId4VcVerificationSessionStateChangedEvent>(
    OpenId4VcVerifierEvents.VerificationSessionStateChanged,
    async (event) => {
      if (event.payload.verificationSession.id === verificationSessionId) {
        if (
          event.payload.verificationSession.state ===
          OpenId4VcVerificationSessionState.ResponseVerified
        ) {
          const verifiedAuthorizationResponse =
            await agent.modules.openId4VcVerifier.getVerifiedAuthorizationResponse(
              verificationSessionId
            );
          storeVerificationResult(
            verificationSessionId,
            verifiedAuthorizationResponse
          );
          console.log(
            "Successfully verified presentation.",
            JSON.stringify(verifiedAuthorizationResponse, null, 2)
          );
          console.log("Exiting...");
          // process.exit();
        }
      }
    }
  );
}
