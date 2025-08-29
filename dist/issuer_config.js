"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issuerRouter = exports.initializeAcmeAgentIssuer = void 0;
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const express_1 = require("express");
const openid4vc_1 = require("@credo-ts/openid4vc");
const credentialMapper_1 = __importDefault(require("./credentialMapper"));
const port_utils_1 = require("./utils/port-utils");
const issuerRouter = (0, express_1.Router)();
exports.issuerRouter = issuerRouter;
require("dotenv").config();
const initializeAcmeAgentIssuer = async () => {
    // Find an available port for the agent's HTTP inbound transport
    // Start from 5000 to avoid conflicts with the web server (which uses 3000+)
    const agentPort = await (0, port_utils_1.findAvailablePort)(5000);
    console.log(`Using port ${agentPort} for agent HTTP inbound transport`);
    const config = {
        label: "demo-agent-acme",
        walletConfig: {
            id: "mainAcmeIssuerWallet",
            key: process.env.ISSUER_WALLET_KEY ??
                (() => {
                    throw new Error("ISSUER_WALLET_KEY is not set in environment variables");
                })(),
            keyDerivationMethod: core_1.KeyDerivationMethod.Argon2IMod,
        },
        endpoints: [`http://0.0.0.0:${agentPort}`],
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
            askar: new askar_1.AskarModule({ ariesAskar: aries_askar_nodejs_1.ariesAskar }),
            openId4VcIssuer: new openid4vc_1.OpenId4VcIssuerModule({
                baseUrl: "https://trustinc.fly.dev/oid4vci/issuer/",
                router: issuerRouter,
                endpoints: {
                    credential: {
                        credentialRequestToCredentialMapper: credentialMapper_1.default,
                    },
                },
            }),
        },
    });
    agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
    agent.registerOutboundTransport(new core_1.WsOutboundTransport());
    agent.registerInboundTransport(new node_1.HttpInboundTransport({ port: agentPort }));
    await agent.initialize();
    return agent;
};
exports.initializeAcmeAgentIssuer = initializeAcmeAgentIssuer;
