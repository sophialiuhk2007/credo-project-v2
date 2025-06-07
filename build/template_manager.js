"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTemplate = exports.saveTemplate = exports.getTemplateById = exports.getAllTemplates = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Define the template directory
const TEMPLATE_DIR = path_1.default.join(__dirname, "../templates");
// Ensure template directory exists
if (!fs_1.default.existsSync(TEMPLATE_DIR)) {
    fs_1.default.mkdirSync(TEMPLATE_DIR, { recursive: true });
}
// Get all templates
const getAllTemplates = () => {
    try {
        const templates = [];
        const files = fs_1.default.readdirSync(TEMPLATE_DIR);
        for (const file of files) {
            if (file.endsWith(".json")) {
                const content = fs_1.default.readFileSync(path_1.default.join(TEMPLATE_DIR, file), "utf8");
                templates.push(JSON.parse(content));
            }
        }
        return templates;
    }
    catch (error) {
        console.error("Error reading templates:", error);
        return [];
    }
};
exports.getAllTemplates = getAllTemplates;
// Get a template by ID
const getTemplateById = (id) => {
    try {
        const filePath = path_1.default.join(TEMPLATE_DIR, `${id}.json`);
        if (!fs_1.default.existsSync(filePath)) {
            return null;
        }
        const content = fs_1.default.readFileSync(filePath, "utf8");
        return JSON.parse(content);
    }
    catch (error) {
        console.error(`Error reading template ${id}:`, error);
        return null;
    }
};
exports.getTemplateById = getTemplateById;
// Save a template
const saveTemplate = (template) => {
    try {
        fs_1.default.writeFileSync(path_1.default.join(TEMPLATE_DIR, `${template.id}.json`), JSON.stringify(template, null, 2));
        return true;
    }
    catch (error) {
        console.error("Error saving template:", error);
        return false;
    }
};
exports.saveTemplate = saveTemplate;
// Delete a template
const deleteTemplate = (id) => {
    try {
        const filePath = path_1.default.join(TEMPLATE_DIR, `${id}.json`);
        if (!fs_1.default.existsSync(filePath)) {
            return false;
        }
        fs_1.default.unlinkSync(filePath);
        return true;
    }
    catch (error) {
        console.error(`Error deleting template ${id}:`, error);
        return false;
    }
};
exports.deleteTemplate = deleteTemplate;
