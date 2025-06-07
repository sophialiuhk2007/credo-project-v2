import fs from "fs";
import type { InitConfig } from "@credo-ts/core";
import {
  Agent,
  KeyDerivationMethod,
  ConsoleLogger,
  LogLevel,
  DidCommMimeType,
  HttpOutboundTransport,
  WsOutboundTransport,
  ConnectionsModule,
} from "@credo-ts/core";
import { agentDependencies } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import { OpenId4VcHolderModule } from "@credo-ts/openid4vc";

export const initializeBobAgent = async () => {
  const config: InitConfig = {
    label: "demo-agent-bob-holder",
    walletConfig: {
      id: "mainBobHolderWallet",
      key: "demoagentbob00000000000000000000",
      keyDerivationMethod: KeyDerivationMethod.Argon2IMod,
    },
    endpoints: ["http://localhost:3001"],
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
      openId4VcHolderModule: new OpenId4VcHolderModule(),
      askar: new AskarModule({ ariesAskar }),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
    },
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());

  await agent.initialize();

  return agent;
};

const run = async () => {
  console.log("Initializing Bob agent...");
  const bobAgent = await initializeBobAgent();

  // Optionally, persist agent state or wallet info here if needed

  // Save a flag or file to indicate initialization is done
  fs.writeFileSync("bob_agent_initialized.txt", "initialized", "utf-8");
  console.log("Bob agent initialized.");
};

export default run;
void run();
