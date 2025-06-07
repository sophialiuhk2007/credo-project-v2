import type { InitConfig } from "@credo-ts/core";
import {
  Agent,
  KeyDerivationMethod,
  ConsoleLogger,
  LogLevel,
  DidCommMimeType,
  HttpOutboundTransport,
  WsOutboundTransport,
} from "@credo-ts/core";
import { agentDependencies, HttpInboundTransport } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import express, { Router } from "express";
import { OpenId4VcIssuerModule } from "@credo-ts/openid4vc";
import credentialRequestToCredentialMapper from "./credentialMapper";
import { findAvailablePort } from "./utils/port-utils";

const issuerRouter = Router();
const app = express();
app.use("/oid4vci", issuerRouter);

const initializeAcmeAgentIssuer = async () => {
  // Find an available port for the agent's HTTP inbound transport
  // Start from 5000 to avoid conflicts with the web server (which uses 3000+)
  const agentPort = await findAvailablePort(5000);
  console.log(`Using port ${agentPort} for agent HTTP inbound transport`);

  const config: InitConfig = {
    label: "demo-agent-acme",
    walletConfig: {
      id: "mainAcmeIssuerWallet",
      key: "demoagentissueracme0000000000000000000 s",
      keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
    },
    endpoints: [`http://localhost:${agentPort}`],
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
      askar: new AskarModule({ ariesAskar }),
      openId4VcIssuer: new OpenId4VcIssuerModule({
        baseUrl: "http://127.0.0.1:3000/oid4vci",
        router: issuerRouter,
        endpoints: {
          credential: {
            credentialRequestToCredentialMapper,
          },
        },
      }),
    },
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port: agentPort }));
  await agent.initialize();

  return agent;
};

export { initializeAcmeAgentIssuer, app };
