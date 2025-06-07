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
import { initializeAcmeAgentIssuer } from "./issuer_config";
import run from "./issuer_main";
import http from "http";
import { findAvailablePort } from "./utils/port-utils";

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

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

app.post("/api/templates", (req: Request, res: Response): Promise<any> => {
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

  return Promise.resolve(res.status(201).json(template));
});

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

// API endpoint to issue credential based on template
app.post("/api/issue", async (req: Request, res: Response): Promise<any> => {
  try {
    const { templateId, data } = req.body;
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Use data as fieldValues
    const fieldValues = data;

    // Initialize the agent
    const acmeAgent = await initializeAcmeAgentIssuer();

    // Here, you'd normally use the template and field values to create a credential
    const result = await run();

    return res.json({
      success: true,
      message: "Credential issued successfully",
      templateUsed: template.id,
    });
  } catch (error) {
    console.error("Error issuing credential:", error);
    return res.status(500).json({ error: "Failed to issue credential" });
  }
});

app.post("/api/templates/:id", (req: Request, res: Response): Promise<any> => {
  const template = req.body as CredentialTemplate;
  if (!template.id || !template.name || !template.vct) {
    return Promise.resolve(
      res.status(400).json({ error: "Missing required fields" })
    );
  }
  // Optionally, check that req.params.id === template.id
  const success = saveTemplate(template);
  if (!success) {
    return Promise.resolve(
      res.status(404).json({ error: "Failed to update template" })
    );
  }
  return Promise.resolve(res.json(template));
});
// Start the server with dynamic port assignment
const startServer = async () => {
  try {
    // Try to use the specified port or find an available one
    // Start from 3000 for web server
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
