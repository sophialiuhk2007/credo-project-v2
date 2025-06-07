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
  BasicMessagesModule,
} from "@credo-ts/core";
import { agentDependencies, HttpInboundTransport } from "@credo-ts/node";
import { AskarModule } from "@credo-ts/askar";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import { OpenId4VcHolderModule } from "@credo-ts/openid4vc";

export const createBobAgent = () => {
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
      basicMessagesModule: new BasicMessagesModule(), // <-- THIS LINE IS REQUIRED
    },
  });

  agent.registerOutboundTransport(new HttpOutboundTransport());
  agent.registerOutboundTransport(new WsOutboundTransport());
  agent.registerInboundTransport(new HttpInboundTransport({ port: 3001 }));
  return agent;
};

export const receiveInvitation = async (
  agent: Agent,
  invitationUrl: string
) => {
  const { outOfBandRecord, connectionRecord } =
    await agent.oob.receiveInvitationFromUrl(invitationUrl);
  return connectionRecord; // <-- return the connectionRecord!
};
