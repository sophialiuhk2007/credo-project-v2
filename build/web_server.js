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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const template_manager_1 = require("./template_manager");
const issuer_config_1 = require("./issuer_config");
const issuer_main_1 = __importDefault(require("./issuer_main"));
// Create Express app
const app = (0, express_1.default)();
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
app.post("/api/issue/:templateId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const template = (0, template_manager_1.getTemplateById)(req.params.templateId);
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        const fieldValues = req.body.fieldValues;
        // Initialize the agent
        const acmeAgent = yield (0, issuer_config_1.initializeAcmeAgentIssuer)();
        // Here, you'd normally use the template and field values to create a credential
        // This is a simplified version that just calls your existing logic
        const result = yield (0, issuer_main_1.default)();
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
}));
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
// Optional: Create a middleware file for authentication if needed
// Create a new file: /Users/mw/Desktop/credo-project-v2/src/middleware/auth.ts
// With the isLoggedIn function as shown in the example
exports.default = app;
