"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const template_manager_1 = require("./template_manager");
const issuer_config_1 = require("./issuer_config");
const issuer_main_1 = __importDefault(require("./issuer_main"));
const port_utils_1 = require("./utils/port-utils");
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
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
app.post("/api/templates", (req, res) => {
    const template = req.body;
    if (!template.id || !template.name || !template.vct) {
        return Promise.resolve(res.status(400).json({ error: "Missing required fields" }));
    }
    const success = (0, template_manager_1.saveTemplate)(template);
    if (!success) {
        return Promise.resolve(res.status(500).json({ error: "Failed to save template" }));
    }
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
// API endpoint to issue credential based on template
app.post("/api/issue", async (req, res) => {
    try {
        const { templateId, data } = req.body;
        const template = (0, template_manager_1.getTemplateById)(templateId);
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        // Use data as fieldValues
        const fieldValues = data;
        // Initialize the agent
        const acmeAgent = await (0, issuer_config_1.initializeAcmeAgentIssuer)();
        // Here, you'd normally use the template and field values to create a credential
        const result = await (0, issuer_main_1.default)();
        return res.json({
            success: true,
            message: "Credential issued successfully",
            templateUsed: template.id,
        });
    }
    catch (error) {
        console.error("Error issuing credential:", error);
        return res.status(500).json({ error: "Failed to issue credential" });
    }
});
app.post("/api/templates/:id", (req, res) => {
    const template = req.body;
    if (!template.id || !template.name || !template.vct) {
        return Promise.resolve(res.status(400).json({ error: "Missing required fields" }));
    }
    // Optionally, check that req.params.id === template.id
    const success = (0, template_manager_1.saveTemplate)(template);
    if (!success) {
        return Promise.resolve(res.status(404).json({ error: "Failed to update template" }));
    }
    return Promise.resolve(res.json(template));
});
// Start the server with dynamic port assignment
const startServer = async () => {
    try {
        // Try to use the specified port or find an available one
        // Start from 3000 for web server
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
