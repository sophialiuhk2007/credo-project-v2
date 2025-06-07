"use strict";
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
const issuer_config_1 = require("./issuer_config");
const initializeIssuer = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Initializing the credential issuer agent...");
    try {
        const acmeAgent = yield (0, issuer_config_1.initializeAcmeAgentIssuer)();
        console.log("Credential issuer agent initialized successfully.");
        return acmeAgent;
    }
    catch (error) {
        console.error("Failed to initialize issuer agent:", error);
        process.exit(1);
        throw error; // To satisfy return type
    }
});
// Start the application
const startApp = () => __awaiter(void 0, void 0, void 0, function* () {
    // Initialize the agent first
    yield initializeIssuer();
    // App is already listening on port 3000 from web_server.ts
    console.log("ACME Credential Issuer is now running!");
    console.log("- Access the web interface at: http://localhost:3000");
    console.log("- API endpoints available at: http://localhost:3000/api/");
});
// Run the application
startApp().catch((error) => {
    console.error("Failed to start application:", error);
    process.exit(1);
});
