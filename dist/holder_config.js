"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiveInvitation = exports.initializeBobAgent = void 0;
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const openid4vc_1 = require("@credo-ts/openid4vc");
const initializeBobAgent = async () => {
    const config = {
        label: "demo-agent-bob-holder",
        walletConfig: {
            id: "mainBobHolderWallet",
            key: "demoagentbob00000000000000000000",
            keyDerivationMethod: core_1.KeyDerivationMethod.Argon2IMod,
        },
        endpoints: ["http://localhost:3001"],
        logger: new core_1.ConsoleLogger(core_1.LogLevel.info),
        didCommMimeType: core_1.DidCommMimeType.V1,
        useDidKeyInProtocols: true,
        connectionImageUrl: "https://static.vecteezy.com/system/resources/previews/053/547/120/non_2x/generic-user-profile-avatar-for-online-platforms-and-social-media-vector.jpg",
        autoUpdateStorageOnStartup: true,
    };
    const agent = new core_1.Agent({
        config,
        dependencies: node_1.agentDependencies,
        modules: {
            openId4VcHolderModule: new openid4vc_1.OpenId4VcHolderModule(),
            askar: new askar_1.AskarModule({ ariesAskar: aries_askar_nodejs_1.ariesAskar }),
            connections: new core_1.ConnectionsModule({ autoAcceptConnections: true }),
        },
    });
    agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
    agent.registerOutboundTransport(new core_1.WsOutboundTransport());
    await agent.initialize();
    return agent;
};
exports.initializeBobAgent = initializeBobAgent;
const receiveInvitation = async (agent, invitationUrl) => {
    const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(invitationUrl);
    return outOfBandRecord;
};
exports.receiveInvitation = receiveInvitation;
