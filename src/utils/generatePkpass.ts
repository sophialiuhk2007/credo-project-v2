import fs from "fs";
import path from "path";
const PKPASS = require("passkit-generator").PKPass;
function ensureFileFromEnv(envVar: string, filePath: string) {
  if (process.env[envVar] && !fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, process.env[envVar] as string);
  }
}
export async function generatePkpassFromTemplate(
  template: any,
  data: any
): Promise<Buffer> {
  const signerCertPath = "/tmp/signerCert.pem";
  const signerKeyPath = "/tmp/signerKey.pem";
  ensureFileFromEnv("SIGNER_CERT", signerCertPath);
  ensureFileFromEnv("SIGNER_KEY", signerKeyPath);

  const newPass = await PKPASS.from(
    {
      model: path.join(__dirname, "../../model/custom.pass"),
      certificates: {
        wwdr: fs.readFileSync(path.join(__dirname, "../../certs/wwdr2.pem")),
        signerCert: fs.readFileSync(signerCertPath),
        signerKey: fs.readFileSync(signerKeyPath),
        signerKeyPassphrase: process.env.PASSKIT_SIGNER_KEY_PASSPHRASE,
      },
    },
    {
      authenticationToken: "abcdefghijklmnopqrstuvwxyz",
      webServiceURL: "https://example.com/passes/",
      serialNumber: "1234567890",
      description: template.pkpass.pkpassDescription || template.description,
      logoText: template.pkpass.logoText || template.pkpass.name,
      foregroundColor: template.pkpass.textColor,
      backgroundColor: template.pkpass.backgroundColor,
    }
  );

  // Helper to parse fields (handles stringified JSON or arrays)
  function parseFields(fields: any) {
    if (!fields) return [];
    if (typeof fields === "string") {
      try {
        return JSON.parse(fields);
      } catch {
        return [];
      }
    }
    return Array.isArray(fields) ? fields : [];
  }

  // Map template fields to pkpass fields using input data
  const primaryFields = parseFields(template.pkpass.primary);

  primaryFields.forEach((field: any, idx: number) => {
    const value = data[field.value.value] ?? field.value.value;
    newPass.primaryFields.push({
      key: `primary${idx}`,
      label: field.label,
      value: data[field.value.value] ?? field.value.value,
    });
  });

  const secondaryFields = parseFields(template.pkpass.secondary);

  secondaryFields.forEach((field: any, idx: number) => {
    newPass.secondaryFields.push({
      key: `secondary${idx}`,
      label: field.label,
      value: data[field.value.value] ?? field.value.value,
    });
  });

  const auxiliaryFields = parseFields(template.pkpass.auxiliary);
  auxiliaryFields.forEach((field: any, idx: number) => {
    newPass.auxiliaryFields.push({
      key: `auxiliary${idx}`,
      label: field.label,
      value: data[field.value.value] ?? field.value.value,
    });
  });
  if (template.pkpass && template.pkpass.thumbnailBase64) {
    const buffer = Buffer.from(template.pkpass.thumbnailBase64, "base64");
    newPass.addBuffer("thumbnail.png", buffer);
    newPass.addBuffer("thumbnail@2x.png", buffer);
  }
  if (template.pkpass && template.pkpass.logoBase64) {
    const buffer = Buffer.from(template.pkpass.logoBase64, "base64");
    newPass.addBuffer("logo.png", buffer);
    newPass.addBuffer("logo@2x.png", buffer);
  }
  return newPass.getAsBuffer();
}
