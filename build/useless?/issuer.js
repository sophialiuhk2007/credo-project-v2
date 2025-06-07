"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@credo-ts/core");
const node_1 = require("@credo-ts/node");
const askar_1 = require("@credo-ts/askar");
const aries_askar_nodejs_1 = require("@hyperledger/aries-askar-nodejs");
const express_1 = __importStar(require("express"));
const openid4vc_1 = require("@credo-ts/openid4vc");
const issuerRouter = (0, express_1.Router)();
const app = (0, express_1.default)();
app.use("/oid4vci", issuerRouter);
const config = {
    /*the label is seen by other users when creating a connection.
  This should not be used as a base for authenticity, as it
  is entirely up to the user to set this.*/
    label: "demo-agent-acme",
    walletConfig: {
        //walletConfig.id: Identifier string. Using another value here will open a new wallet.
        id: "mainAcmeIssuerWallet",
        //Key to unlock the wallet with. This value MUST be kept as a secret and should be seem like a password.
        key: "demoagentissueracme0000000000000000000 s",
        keyDerivationMethod: core_1.KeyDerivationMethod.Argon2IMod,
        /*The method used for key derivation of the walletConfig.key.
        Members:
        KeyDerivationMethod.Argon2IMod: uses Argon2I modular (most secure option, but slower)
        KeyDerivationMethod.Argon2Int: uses Argon2 integer (less secure, but faster)
        KeyDerivationMethod.Raw: uses no derivation method and the key must be a base58-encoded ChaCha20-Poly1305 key.*/
        // storage: {
        //     type: 'postgres_storage',
        // // depends on the storage type
        // }
    },
    endpoints: ["https://localhost:3001"],
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
        // Register the Askar module on the agent
        askar: new askar_1.AskarModule({
            ariesAskar: aries_askar_nodejs_1.ariesAskar,
        }),
        openId4VcIssuer: new openid4vc_1.OpenId4VcIssuerModule({
            baseUrl: "http://127.0.0.1:3000/oid4vci",
            // If no router is passed, one will be created.
            // you still have to register the router on your express server
            // but you can access it on agent.modules.openId4VcIssuer.config.router
            // It works the same for verifier: agent.modules.openId4VcVerifier.config.router
            router: issuerRouter,
            // Each of the endpoints can have configuration associated with it, such as the
            // path (under the baseUrl) to use for the endpoints.
            endpoints: {
                // The credentialRequestToCredentialMapper is the only required endpoint
                // configuration that must be provided. This method is called whenever a
                // credential request has been received for an offer we created. The callback should
                // return the issued credential to return in the credential response to the holder.
                credential: {
                    credentialRequestToCredentialMapper: () => __awaiter(void 0, void 0, void 0, function* () {
                        throw new Error("Not implemented");
                    }),
                },
            },
        }),
    },
});
agent.registerOutboundTransport(new core_1.HttpOutboundTransport());
agent.registerOutboundTransport(new core_1.WsOutboundTransport());
agent.registerInboundTransport(new node_1.HttpInboundTransport({ port: 3001 })); //avoid conflict with app
agent
    .initialize()
    .then(() => {
    console.log("Agent initialized!");
})
    .catch((e) => {
    console.error(`Something went wrong while setting up the agent! Message: ${e}`);
});
app.listen(3000);
