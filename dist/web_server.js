"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const template_manager_1 = require("./template_manager");
const issuer_main_1 = require("./issuer_main");
const issuer_config_1 = require("./issuer_config"); // <-- add this
const port_utils_1 = require("./utils/port-utils");
const dotenv_1 = __importDefault(require("dotenv"));
const generatePkpass_1 = require("./utils/generatePkpass"); // <-- create this utility
const verifier_main_1 = require("./verifier_main");
const openid4vc_1 = require("@credo-ts/openid4vc");
dotenv_1.default.config();
const PKPASS = require("passkit-generator").PKPass;
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
let openId4VcVerifier;
// Middleware
app.use(express_1.default.json({ limit: "5mb" })); // <-- Increase as needed
app.use(express_1.default.urlencoded({ limit: "5mb", extended: true })); // For form data
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
app.use("/oid4vci", issuer_config_1.issuerRouter); // <-- add this before your routes
// Routes
app.get("/", (req, res) => {
    return Promise.resolve(res.sendFile(path_1.default.join(__dirname, "../public", "index.html")));
});
// API endpoints for templates
app.get("/api/templates", (req, res) => {
    const templates = (0, template_manager_1.getAllTemplates)();
    return Promise.resolve(res.json(templates));
});
app.get("/api/templates/:id", (req, res) => {
    const template = (0, template_manager_1.getTemplateById)(req.params.id);
    if (!template) {
        return Promise.resolve(res.status(404).json({ error: "Template not found" }));
    }
    return Promise.resolve(res.json(template));
});
app.post("/api/templates", async (req, res) => {
    const template = req.body;
    if (!template.id || !template.name || !template.vct) {
        return Promise.resolve(res.status(400).json({ error: "Missing required fields" }));
    }
    const success = (0, template_manager_1.saveTemplate)(template);
    if (!success) {
        return Promise.resolve(res.status(500).json({ error: "Failed to save template" }));
    }
    // Refresh issuer's supported credentials
    await (0, issuer_main_1.initializeIssuer)();
    return Promise.resolve(res.status(201).json(template));
});
app.delete("/api/templates/:id", (req, res) => {
    const success = (0, template_manager_1.deleteTemplate)(req.params.id);
    if (!success) {
        return Promise.resolve(res
            .status(404)
            .json({ error: "Template not found or could not be deleted" }));
    }
    return Promise.resolve(res.status(204).send());
});
app.get("/api/verification-session/:id", async (req, res) => {
    try {
        const sessionId = req.params.id;
        if (!verifier_main_1.verifierAgent) {
            return res
                .status(500)
                .json({ error: "Verifier agent not initialized" });
        }
        const openId4VcVerifierApi = verifier_main_1.verifierAgent.dependencyManager.resolve(openid4vc_1.OpenId4VcVerifierApi);
        const session = await openId4VcVerifierApi.getVerificationSessionById(sessionId);
        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }
        res.json({
            id: session.id,
            state: session.state,
            // Optionally, more details
        });
    }
    catch (error) {
        console.error("Error fetching verification session:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/api/issue", async (req, res) => {
    console.log("Received issue request:", req.body);
    try {
        const { templateId, data } = req.body;
        const template = (0, template_manager_1.getTemplateById)(templateId);
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        const { credentialOffer, issuanceSession } = await (0, issuer_main_1.issueCredentialOffer)(data, templateId, template);
        console.log("credentialOffer:", credentialOffer);
        const pkpassBuffer = await (0, generatePkpass_1.generatePkpassFromTemplate)(template, data);
        const pkpassBase64 = pkpassBuffer.toString("base64");
        return res.json({
            success: true,
            message: "Credential issued successfully",
            templateUsed: template.id,
            offerUrl: credentialOffer || undefined,
            pkpassBase64: pkpassBase64,
        });
    }
    catch (error) {
        console.error("Error issuing credential:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to issue credential" });
        }
    }
});
app.put("/api/templates/:id", async (req, res) => {
    const template = req.body;
    if (!template.id || !template.name || !template.vct) {
        return Promise.resolve(res.status(400).json({ error: "Missing required fields" }));
    }
    const success = (0, template_manager_1.saveTemplate)(template);
    if (!success) {
        return Promise.resolve(res.status(404).json({ error: "Failed to update template" }));
    }
    // Refresh issuer's supported credentials
    await (0, issuer_main_1.initializeIssuer)();
    return Promise.resolve(res.json(template));
});
app.post("/create-verification-request", async (req, res) => {
    try {
        const { presentationExchange } = req.body;
        if (!presentationExchange) {
            return res
                .status(400)
                .json({ error: "Missing presentationExchange in request body." });
        }
        if (!verifier_main_1.verifierAgent || !openId4VcVerifier) {
            return res
                .status(500)
                .json({ error: "Verifier agent not initialized." });
        }
        const { authorizationRequest, verificationSession } = await (0, verifier_main_1.createAuthorizationRequestAndSession)(verifier_main_1.verifierAgent, openId4VcVerifier, presentationExchange);
        res.json({
            authorizationRequestUrl: authorizationRequest,
            verificationSessionId: verificationSession.id,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
// Start the server with dynamic port assignment
const startServer = async () => {
    try {
        // Initialize agent, issuer, and DID before starting the server
        await (0, issuer_main_1.initializeIssuer)();
        await (0, verifier_main_1.initializeAcmeVerifierAgent)();
        openId4VcVerifier =
            await verifier_main_1.verifierAgent.modules.openId4VcVerifier.createVerifier({}); // Try to use the specified port or find an available one
        if (verifier_main_1.verifierAgent) {
            // Mount the OpenID4VC verifier router
            const openId4VcVerifierRouter = verifier_main_1.verifierAgent.modules.openId4VcVerifier.getRouter();
            app.use("/oid4vci", openId4VcVerifierRouter);
        }
        else {
            throw new Error("verifierAgent is undefined");
        }
        const preferredPort = parseInt(process.env.PORT || "3000", 10);
        const port = await (0, port_utils_1.findAvailablePort)(preferredPort);
        const server = app.listen(port, () => {
            console.log(`Web server running on http://localhost:${port}`);
            if (port !== preferredPort) {
                console.log(`Note: Using port ${port} instead of ${preferredPort} because the preferred port was in use.`);
            }
        });
        // Add a graceful shutdown
        process.on("SIGTERM", () => {
            console.log("SIGTERM received, shutting down server gracefully");
            server.close(() => {
                console.log("Server closed");
            });
        });
        return server;
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
exports.startServer = startServer;
