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
import {
  initializeAcmeVerifierAgent,
  createAuthorizationRequestAndSession,
  verifierAgent,
} from "./verifier_main";
import { OpenId4VcVerifierApi } from "@credo-ts/openid4vc";

dotenv.config();

const PKPASS = require("passkit-generator").PKPass;
// Create Express app
const app = express();
let openId4VcVerifier: any;

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
app.get(
  "/api/verification-session/:id",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const sessionId = req.params.id;
      if (!verifierAgent) {
        return res
          .status(500)
          .json({ error: "Verifier agent not initialized" });
      }
      const openId4VcVerifierApi =
        verifierAgent.dependencyManager.resolve(OpenId4VcVerifierApi);
      const session = await openId4VcVerifierApi.getVerificationSessionById(
        sessionId
      );

      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json({
        id: session.id,
        state: session.state,
        // Optionally, more details
      });
    } catch (error) {
      console.error("Error fetching verification session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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

app.post(
  "/create-verification-request",
  async (req: Request, res: Response): Promise<any> => {
    try {
      const { presentationExchange } = req.body;
      if (!presentationExchange) {
        return res
          .status(400)
          .json({ error: "Missing presentationExchange in request body." });
      }
      if (!verifierAgent || !openId4VcVerifier) {
        return res
          .status(500)
          .json({ error: "Verifier agent not initialized." });
      }
      const { authorizationRequest, verificationSession } =
        await createAuthorizationRequestAndSession(
          verifierAgent,
          openId4VcVerifier,
          presentationExchange
        );
      res.json({
        authorizationRequestUrl: authorizationRequest,
        verificationSessionId: verificationSession.id,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

// Start the server with dynamic port assignment
const startServer = async () => {
  try {
    // Initialize agent, issuer, and DID before starting the server
    await initializeIssuer();
    await initializeAcmeVerifierAgent();
    openId4VcVerifier =
      await verifierAgent!.modules.openId4VcVerifier.createVerifier({}); // Try to use the specified port or find an available one
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
