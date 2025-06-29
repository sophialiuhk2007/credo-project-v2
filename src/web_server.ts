import express, { Request, Response } from "express";
import { ParsedQs } from "qs";
import path from "path";
import {
  getAllTemplates,
  getTemplateById,
  saveTemplate,
  deleteTemplate,
  CredentialTemplate,
} from "./template_manager";
import { initializeIssuer, issueCredentialOffer } from "./issuer_main";
import { issuerRouter } from "./issuer_config"; // <-- add this
import { findAvailablePort } from "./utils/port-utils";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { generatePkpassFromTemplate } from "./utils/generatePkpass"; // <-- create this utility

dotenv.config();

const PKPASS = require("passkit-generator").PKPass;
// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: "5mb" })); // <-- Increase as needed
app.use(express.urlencoded({ limit: "5mb", extended: true })); // For form data

app.use(express.static(path.join(__dirname, "../public")));

app.use("/oid4vci", issuerRouter); // <-- add this before your routes
// Routes
app.get("/", (req: Request, res: Response): Promise<any> => {
  return Promise.resolve(
    res.sendFile(path.join(__dirname, "../public", "index.html"))
  );
});

// API endpoints for templates
app.get("/api/templates", (req: Request, res: Response): Promise<any> => {
  const templates = getAllTemplates();
  return Promise.resolve(res.json(templates));
});

app.get("/api/templates/:id", (req: Request, res: Response): Promise<any> => {
  const template = getTemplateById(req.params.id);
  if (!template) {
    return Promise.resolve(
      res.status(404).json({ error: "Template not found" })
    );
  }
  return Promise.resolve(res.json(template));
});

app.post(
  "/api/templates",
  async (req: Request, res: Response): Promise<any> => {
    const template = req.body as CredentialTemplate;

    if (!template.id || !template.name || !template.vct) {
      return Promise.resolve(
        res.status(400).json({ error: "Missing required fields" })
      );
    }

    const success = saveTemplate(template);
    if (!success) {
      return Promise.resolve(
        res.status(500).json({ error: "Failed to save template" })
      );
    }

    // Refresh issuer's supported credentials
    await initializeIssuer();

    return Promise.resolve(res.status(201).json(template));
  }
);

app.delete(
  "/api/templates/:id",
  (req: Request, res: Response): Promise<any> => {
    const success = deleteTemplate(req.params.id);
    if (!success) {
      return Promise.resolve(
        res
          .status(404)
          .json({ error: "Template not found or could not be deleted" })
      );
    }

    return Promise.resolve(res.status(204).send());
  }
);

app.post("/api/issue", async (req: Request, res: Response): Promise<any> => {
  console.log("Received issue request:", req.body);
  try {
    const { templateId, data } = req.body;
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const { credentialOffer, issuanceSession } = await issueCredentialOffer(
      data,
      templateId,
      template
    );
    console.log("credentialOffer:", credentialOffer);
    const pkpassBuffer = await generatePkpassFromTemplate(template, data);
    const pkpassBase64 = pkpassBuffer.toString("base64");
    const passesDir = path.join(__dirname, "../passes");
    if (!fs.existsSync(passesDir)) {
      fs.mkdirSync(passesDir);
    }
    const filename = `pass-${Date.now()}.pkpass`;
    const filePath = path.join(passesDir, filename);
    fs.writeFileSync(filePath, pkpassBuffer);
    console.log(`Saved pkpass to ${filePath}`);

    return res.json({
      success: true,
      message: "Credential issued successfully",
      templateUsed: template.id,
      offerUrl: credentialOffer || undefined,
      pkpassBase64: pkpassBase64,
    });
  } catch (error) {
    console.error("Error issuing credential:", error);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to issue credential" });
    }
  }
});

app.put(
  "/api/templates/:id",
  async (req: Request, res: Response): Promise<any> => {
    const template = req.body as CredentialTemplate;
    if (!template.id || !template.name || !template.vct) {
      return Promise.resolve(
        res.status(400).json({ error: "Missing required fields" })
      );
    }
    const success = saveTemplate(template);
    if (!success) {
      return Promise.resolve(
        res.status(404).json({ error: "Failed to update template" })
      );
    }

    // Refresh issuer's supported credentials
    await initializeIssuer();

    return Promise.resolve(res.json(template));
  }
);

// Start the server with dynamic port assignment
const startServer = async () => {
  try {
    // Initialize agent, issuer, and DID before starting the server
    await initializeIssuer();

    // Try to use the specified port or find an available one
    const preferredPort = parseInt(process.env.PORT || "3000", 10);
    const port = await findAvailablePort(preferredPort);

    const server = app.listen(port, () => {
      console.log(`Web server running on http://localhost:${port}`);
      if (port !== preferredPort) {
        console.log(
          `Note: Using port ${port} instead of ${preferredPort} because the preferred port was in use.`
        );
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
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Don't start the server immediately - export the startServer function
export { app, startServer };
