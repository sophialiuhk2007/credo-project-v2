import fs from "fs";
import path from "path";

// Define the template directory
const TEMPLATE_DIR = path.join(__dirname, "../templates");

// Ensure template directory exists
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

// Template interface
export interface CredentialField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

export interface CredentialTemplate {
  id: string;
  name: string;
  description?: string;
  vct: string;
  fields: TemplateField[];
}

export interface TemplateField {
  name: string;
  type: "text" | "number" | "email" | "date";
  required: boolean;
  description?: string;
  selectivelyDisclosable: boolean; // New property
}

// Get all templates
export const getAllTemplates = (): CredentialTemplate[] => {
  try {
    const templates: CredentialTemplate[] = [];
    const files = fs.readdirSync(TEMPLATE_DIR);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = fs.readFileSync(path.join(TEMPLATE_DIR, file), "utf8");
        templates.push(JSON.parse(content));
      }
    }

    return templates;
  } catch (error) {
    console.error("Error reading templates:", error);
    return [];
  }
};

// Get a template by ID
export const getTemplateById = (id: string): CredentialTemplate | null => {
  try {
    const filePath = path.join(TEMPLATE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading template ${id}:`, error);
    return null;
  }
};

// Async fetch template by ID (Promise-based)
export const fetchTemplateById = async (
  id: string
): Promise<CredentialTemplate | null> => {
  try {
    const filePath = path.join(TEMPLATE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error fetching template ${id}:`, error);
    return null;
  }
};

// Save a template
export const saveTemplate = (template: CredentialTemplate): boolean => {
  try {
    fs.writeFileSync(
      path.join(TEMPLATE_DIR, `${template.id}.json`),
      JSON.stringify(template, null, 2)
    );
    return true;
  } catch (error) {
    console.error("Error saving template:", error);
    return false;
  }
};

// Delete a template
export const deleteTemplate = (id: string): boolean => {
  try {
    const filePath = path.join(TEMPLATE_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error(`Error deleting template ${id}:`, error);
    return false;
  }
};
