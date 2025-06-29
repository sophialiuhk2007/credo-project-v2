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

dotenv.config();

const PKPASS = require("passkit-generator").PKPass;
// Create Express app
const app = express();

// Middleware
app.use(express.json());
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

// API endpoint to issue credential based on template
app.post("/api/issue", async (req: Request, res: Response): Promise<any> => {
  console.log("Received issue request:", req.body);
  try {
    const { templateId, data } = req.body;
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Pass both data and template to issueCredentialOffer
    const { credentialOffer, issuanceSession } = await issueCredentialOffer(
      data,
      templateId,
      template // Pass the full template
    );
    console.log("credentialOffer:", credentialOffer);

    return res.json({
      success: true,
      message: "Credential issued successfully",
      templateUsed: template.id,
      offerUrl: credentialOffer || undefined,
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

// app.post("/api/pass", async (req: Request, res: Response): Promise<void> => {
//   try {
//     // Your pkpass logic here (adapted from your Firebase function)
//     if (
//       !req.body ||
//       !req.body.primary ||
//       !Array.isArray(req.body.secondary) ||
//       req.body.secondary.length < 2 ||
//       !Array.isArray(req.body.auxiliary) ||
//       req.body.auxiliary.length < 2
//     ) {
//       res.status(400).send({ message: "Invalid request body" });
//       return;
//     }

//     const keyContent = fs.readFileSync(
//       path.join(__dirname, "../certs/signerKey.pem"),
//       "utf8"
//     );
//     const newPass = await PKPASS.from(
//       {
//         model: path.join(__dirname, "../model/custom.pass"),
//         certificates: {
//           wwdr: fs.readFileSync(path.join(__dirname, "../certs/wwdr2.pem")),
//           signerCert: fs.readFileSync(
//             path.join(__dirname, "../certs/signerCert.pem")
//           ),
//           signerKey: fs.readFileSync(
//             path.join(__dirname, "../certs/signerKey.pem")
//           ),
//           signerKeyPassphrase: process.env.PASSKIT_SIGNER_KEY_PASSPHRASE,
//         },
//       },
//       {
//         authenticationToken: "abcdefghijklmnopqrstuvwxyz",
//         webServiceURL: "https://example.com/passes/",
//         serialNumber: "1234567890",
//         description: req.body.description,
//         logoText: req.body.logoText,
//         foregroundColor: req.body.textColor,
//         backgroundColor: req.body.backgroundColor,
//       }
//     );

//     newPass.primaryFields.push({
//       key: "primary",
//       label: req.body.primary.label,
//       value: req.body.primary.value,
//     });
//     newPass.secondaryFields.push(
//       {
//         key: "secondary0",
//         label: req.body.secondary[0].label,
//         value: req.body.secondary[0].value,
//       },
//       {
//         key: "secondary1",
//         label: req.body.secondary[1].label,
//         value: req.body.secondary[1].value,
//       }
//     );
//     newPass.auxiliaryFields.push(
//       {
//         key: "auxiliary0",
//         label: req.body.auxiliary[0].label,
//         value: req.body.auxiliary[0].value,
//       },
//       {
//         key: "auxiliary1",
//         label: req.body.auxiliary[1].label,
//         value: req.body.auxiliary[1].value,
//       }
//     );
//     newPass.setBarcodes([
//       {
//         message: "1234567890",
//         format: "PKBarcodeFormatQR",
//         messageEncoding: "iso-8859-1",
//       },
//     ]);

//     const resp = await axios.get(req.body.thumbnailUrl, {
//       responseType: "arraybuffer",
//     });
//     const buffer = Buffer.from(resp.data, "utf-8");
//     newPass.addBuffer("thumbnail.png", buffer);
//     const bufferData = newPass.getAsBuffer();

//     // Send the .pkpass file directly in the response
//     res.setHeader("Content-Type", "application/vnd.apple.pkpass");
//     res.setHeader("Content-Disposition", "attachment; filename=custom.pkpass");
//     res.send(bufferData);
//     return;
//   } catch (err) {
//     console.error("Error generating pass:", err);
//     res.status(500).send({
//       message: "Error generating pass.",
//       error: err instanceof Error ? err.message : String(err),
//     });
//     return;
//   }
// });

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
