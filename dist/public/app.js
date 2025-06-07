/**
 * ACME Credential Issuer Portal - Frontend Logic
 */

// State Management
const AppState = {
  currentPage: "home",
  templates: [],
  currentTemplate: null,
  selectedTemplateId: null,
  issuanceStep: "select",
  loadingState: {
    templates: false,
    issuance: false,
  },
};

// DOM Elements
const DOM = {
  // Navigation
  navButtons: {
    home: document.getElementById("homeBtn"),
    templates: document.getElementById("templatesBtn"),
    issue: document.getElementById("issueBtn"),
  },
  pageTitle: document.getElementById("currentPageTitle"),
  pages: {
    home: document.getElementById("home"),
    templates: document.getElementById("templates"),
    templateEditor: document.getElementById("templateEditor"),
    issueCredential: document.getElementById("issueCredential"),
  },

  // Templates
  templatesList: document.getElementById("templatesList"),
  templateForm: document.getElementById("templateForm"),
  newTemplateBtn: document.getElementById("newTemplateBtn"),
  cancelTemplateBtn: document.getElementById("cancelTemplateBtn"),
  templateSearch: document.getElementById("templateSearch"),
  fieldsContainer: document.getElementById("fieldsContainer"),
  addFieldBtn: document.getElementById("addFieldBtn"),
  editorTitle: document.getElementById("editorTitle"),
  editorBreadcrumb: document.getElementById("editorBreadcrumb"),
  backToTemplates: document.getElementById("backToTemplates"),

  // Statistics
  templateCount: document.getElementById("templateCount"),
  credentialCount: document.getElementById("credentialCount"),

  // Issuance
  templateSelect: document.getElementById("templateSelect"),
  issueTemplateGrid: document.getElementById("issueTemplateGrid"),
  issueTemplateSearch: document.getElementById("issueTemplateSearch"),
  selectedTemplateName: document.getElementById("selectedTemplateName"),
  selectedTemplateDescription: document.getElementById(
    "selectedTemplateDescription"
  ),
  templateFieldsContainer: document.getElementById("templateFieldsContainer"),
  credentialForm: document.getElementById("credentialForm"),
  issueForm: document.getElementById("issueForm"),
  credentialResult: document.getElementById("credentialResult"),
  credentialOfferUrl: document.getElementById("credentialOfferUrl"),
  copyUrlBtn: document.getElementById("copyUrlBtn"),
  issueNewBtn: document.getElementById("issueNewBtn"),
  selectTemplateStep: document.getElementById("selectTemplateStep"),
  continueToDetailsBtn: document.getElementById("continueToDetailsBtn"),
  backToSelectBtn: document.getElementById("backToSelectBtn"),
  issuanceSteps: document.querySelectorAll(".issuance-stepper .step"),
};
function toTitleCase(str) {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (x) => x.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}
function toCamelCaseWithCap(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toUpperCase() : word.toUpperCase()
    )
    .replace(/\s+/g, "");
}
// API Service
const API = {
  baseUrl: "/api",

  async getTemplates() {
    try {
      const response = await fetch(`${this.baseUrl}/templates`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return await response.json();
    } catch (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
  },

  async getTemplate(id) {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${id}`);
      if (!response.ok) throw new Error(`Failed to fetch template ${id}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching template ${id}:`, error);
      return null;
    }
  },

  async saveTemplate(template) {
    try {
      // Check if this id exists in the current templates list
      const exists = AppState.templates.some((t) => t.id === template.id);
      const method = "POST";
      const url = exists
        ? `${this.baseUrl}/templates/${template.id}`
        : `${this.baseUrl}/templates`;
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error("Failed to save template");
      return await response.json();
    } catch (error) {
      console.error("Error saving template:", error);
      return null;
    }
  },

  async deleteTemplate(id) {
    try {
      const response = await fetch(`${this.baseUrl}/templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(`Failed to delete template ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      return false;
    }
  },

  async issueCredential(templateId, data) {
    try {
      const response = await fetch(`${this.baseUrl}/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
          data,
        }),
      });

      if (!response.ok) throw new Error("Failed to issue credential");
      return await response.json();
    } catch (error) {
      console.error("Error issuing credential:", error);
      return null;
    }
  },
};

// UI Controller
const UI = {
  navigateTo(page) {
    // Hide all pages
    Object.values(DOM.pages).forEach((pageEl) => {
      pageEl.classList.remove("active");
    });

    // Remove active class from all nav buttons
    Object.values(DOM.navButtons).forEach((btn) => {
      btn.classList.remove("active");
    });

    // Show selected page
    if (DOM.pages[page]) {
      DOM.pages[page].classList.add("active");
    } else {
      console.warn(`Page "${page}" not found in DOM.pages`);
      return;
    }
    // Update active nav button
    if (DOM.navButtons[page]) {
      DOM.navButtons[page].classList.add("active");
    }

    // Update page title
    this.updatePageTitle(page);

    // Update state
    AppState.currentPage = page;
  },

  updatePageTitle(page) {
    let title = "Dashboard";

    switch (page) {
      case "templates":
        title = "Templates";
        break;
      case "templateEditor":
        title = "Template Editor";
        break;
      case "issueCredential":
        title = "Issue Credentials";
        break;
    }

    DOM.pageTitle.textContent = title;
  },

  async renderTemplatesList() {
    DOM.templatesList.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading templates...</p>
      </div>
    `;

    AppState.loadingState.templates = true;

    try {
      const templates = await API.getTemplates();
      AppState.templates = templates;

      if (templates.length === 0) {
        DOM.templatesList.innerHTML = `
          <div class="empty-state">
            <p>No templates found. Create your first template to get started.</p>
          </div>
        `;
        return;
      }

      DOM.templatesList.innerHTML = "";
      templates.forEach((template) => {
        const templateCard = document.createElement("div");
        templateCard.className = "template-card";
        templateCard.innerHTML = `
          <div class="template-card-header">
            <h3>${template.name}</h3>
          </div>
          <div class="template-card-body">
            <p class="template-description">${
              template.description || "No description provided"
            }</p>
            <div class="template-meta">
              <i class="fas fa-tag"></i> ${template.vct}
            </div>
          </div>
          <div class="template-card-footer">
            <button class="btn secondary-btn edit-template" data-id="${
              template.id
            }">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn secondary-btn delete-template" data-id="${
              template.id
            }">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        DOM.templatesList.appendChild(templateCard);
      });

      // Update stats
      DOM.templateCount.textContent = templates.length;

      // Add event listeners
      DOM.templatesList.querySelectorAll(".edit-template").forEach((btn) => {
        btn.addEventListener("click", () => this.editTemplate(btn.dataset.id));
      });

      DOM.templatesList.querySelectorAll(".delete-template").forEach((btn) => {
        btn.addEventListener("click", () =>
          this.deleteTemplate(btn.dataset.id)
        );
      });
    } catch (error) {
      console.error("Error rendering templates list:", error);
      DOM.templatesList.innerHTML = `
        <div class="error-state">
          <p>Failed to load templates. Please try again later.</p>
        </div>
      `;
    } finally {
      AppState.loadingState.templates = false;
    }
  },

  async renderIssueTemplateGrid() {
    DOM.issueTemplateGrid.innerHTML = `
      <div class="loading-indicator">
        <div class="spinner"></div>
        <p>Loading templates...</p>
      </div>
    `;

    try {
      const templates = await API.getTemplates();

      if (templates.length === 0) {
        DOM.issueTemplateGrid.innerHTML = `
          <div class="empty-state">
            <p>No templates found. Create templates before issuing credentials.</p>
          </div>
        `;
        return;
      }

      DOM.issueTemplateGrid.innerHTML = "";
      templates.forEach((template) => {
        const templateCard = document.createElement("div");
        templateCard.className = "template-card";
        templateCard.dataset.id = template.id;
        templateCard.innerHTML = `
          <div class="template-card-header">
            <h3>${template.name}</h3>
          </div>
          <div class="template-card-body">
            <p class="template-description">${
              template.description || "No description provided"
            }</p>
            <div class="template-meta">
              <i class="fas fa-tag"></i> ${template.vct}
            </div>
          </div>
        `;
        DOM.issueTemplateGrid.appendChild(templateCard);

        // Add click event
        templateCard.addEventListener("click", () => {
          // Remove selection from all cards
          DOM.issueTemplateGrid
            .querySelectorAll(".template-card")
            .forEach((card) => {
              card.classList.remove("selected");
            });

          // Add selection to clicked card
          templateCard.classList.add("selected");

          // Update state
          AppState.selectedTemplateId = template.id;

          // Enable continue button
          DOM.continueToDetailsBtn.disabled = false;
        });
      });
    } catch (error) {
      console.error("Error rendering issue template grid:", error);
      DOM.issueTemplateGrid.innerHTML = `
        <div class="error-state">
          <p>Failed to load templates. Please try again later.</p>
        </div>
      `;
    }
  },

  resetTemplateForm() {
    DOM.templateForm.reset();
    DOM.fieldsContainer.innerHTML = "";
    if (DOM.editorTitle) DOM.editorTitle.textContent = "Create New Template";
    DOM.editorBreadcrumb.textContent = "New Template";
    const nameInput = document.getElementById("templateName");
    if (nameInput) nameInput.disabled = false; // Enable editing name
    AppState.currentTemplate = null;
  },

  async editTemplate(id) {
    try {
      const template = await API.getTemplate(id);
      if (!template) throw new Error(`Template ${id} not found`);
      AppState.currentTemplate = template;
      const nameInput = document.getElementById("templateName");
      nameInput.value = template.name;
      nameInput.disabled = true; // Prevent editing name
      document.getElementById("templateDescription").value =
        template.description || "";

      // Add fields
      DOM.fieldsContainer.innerHTML = "";
      if (template.fields && template.fields.length > 0) {
        template.fields.forEach((field) => this.addFieldToForm(field));
      }

      // Update title
      if (DOM.editorTitle) {
        DOM.editorTitle.textContent = "Edit Template";
      }
      if (DOM.editorBreadcrumb) {
        DOM.editorBreadcrumb.textContent = template.name;
      }

      // Navigate to editor
      this.navigateTo("templateEditor");
    } catch (error) {
      console.error(`Error editing template ${id}:`, error);
      alert("Failed to load template for editing. Please try again.");
    }
  },

  async deleteTemplate(id) {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const success = await API.deleteTemplate(id);
      if (!success) throw new Error(`Failed to delete template ${id}`);

      // Refresh templates list
      this.renderTemplatesList();
      await this.renderIssueTemplateGrid();
    } catch (error) {
      console.error(`Error deleting template ${id}:`, error);
      alert("Failed to delete template. Please try again.");
    }
  },

  addFieldToForm(fieldData = null) {
    const fieldId = Date.now();
    const fieldTemplate = document.getElementById("fieldTemplate");
    if (!fieldTemplate) {
      console.error("Field template not found in the DOM");
      return;
    }
    const fieldNode = document.importNode(fieldTemplate.content, true);

    // Update the id and for attributes for the checkbox and label
    const checkbox = fieldNode.querySelector(".field-required");
    const label = fieldNode.querySelector('label[for^="field-required-"]');
    if (checkbox) checkbox.id = `field-required-${fieldId}`;
    if (label) label.setAttribute("for", `field-required-${fieldId}`);

    // If editing an existing field, fill in the values
    if (fieldData) {
      const fieldElement = fieldNode.querySelector(".field-item");
      fieldElement.querySelector(".field-name").value = fieldData.name;
      fieldElement.querySelector(".field-type").value = fieldData.type;
      fieldElement.querySelector(".field-description").value =
        fieldData.description || "";
      fieldElement.querySelector(".field-required").checked =
        fieldData.required || false;
      fieldElement.querySelector(".field-title").textContent = fieldData.name;
    }

    // Add remove event listener
    fieldNode
      .querySelector(".remove-field")
      .addEventListener("click", function () {
        this.closest(".field-item").remove();
      });

    // Add field name change listener
    fieldNode
      .querySelector(".field-name")
      .addEventListener("input", function () {
        this.closest(".field-item").querySelector(".field-title").textContent =
          this.value || "Field";
      });

    DOM.fieldsContainer.appendChild(fieldNode);
  },

  async handleTemplateFormSubmit(event) {
    event.preventDefault();

    try {
      const nameInput = document.getElementById("templateName");
      const rawName = nameInput.value.trim();
      const name = toTitleCase(rawName); // Standard punctuation

      // Generate id and vct from name
      const camelName = toCamelCaseWithCap(name);

      // Prevent duplicate IDs on creation
      if (!AppState.currentTemplate) {
        const exists = AppState.templates.some((t) => t.id === camelName);
        if (exists) {
          alert(
            "A template with this name already exists. Please choose a different name."
          );
          nameInput.focus();
          return;
        }
      }

      const templateData = {
        id: camelName,
        name,
        description: document.getElementById("templateDescription").value,
        vct: camelName,
        fields: [],
      };

      // Gather fields data
      const fieldElements = DOM.fieldsContainer.querySelectorAll(".field-item");
      fieldElements.forEach((fieldEl) => {
        templateData.fields.push({
          name: fieldEl.querySelector(".field-name").value,
          type: fieldEl.querySelector(".field-type").value,
          description: fieldEl.querySelector(".field-description").value,
          required: fieldEl.querySelector(".field-required").checked,
        });
      });

      // Save template
      const savedTemplate = await API.saveTemplate(templateData);
      if (!savedTemplate) throw new Error("Failed to save template");

      alert(`Template "${savedTemplate.name}" saved successfully!`);
      await this.renderTemplatesList();
      await this.renderIssueTemplateGrid(); // <-- Add this line
      this.navigateTo("templates");
    } catch (error) {
      console.error("Error saving template:", error);
      alert("Failed to save template. Please try again.");
    }
  },

  updateIssuanceStep(step) {
    // Update state
    AppState.issuanceStep = step;

    // Hide all steps
    document.querySelectorAll(".issuance-step").forEach((stepEl) => {
      stepEl.classList.remove("active");
    });

    // Show current step
    document
      .getElementById(
        step === "select"
          ? "selectTemplateStep"
          : step === "fill"
          ? "credentialForm"
          : "credentialResult"
      )
      .classList.add("active");

    // Update stepper
    DOM.issuanceSteps.forEach((stepEl) => {
      stepEl.classList.remove("active");
      if (stepEl.dataset.step === step) {
        stepEl.classList.add("active");
      } else if (
        (step === "fill" && stepEl.dataset.step === "select") ||
        (step === "issue" &&
          (stepEl.dataset.step === "select" || stepEl.dataset.step === "fill"))
      ) {
        stepEl.classList.add("active");
      }
    });
  },

  async continueToCredentialDetails() {
    if (!AppState.selectedTemplateId) return;

    try {
      const template = await API.getTemplate(AppState.selectedTemplateId);
      if (!template)
        throw new Error(`Template ${AppState.selectedTemplateId} not found`);

      // Update form
      DOM.selectedTemplateName.textContent = template.name;
      DOM.selectedTemplateDescription.textContent =
        template.description || "No description provided";

      // Create form fields
      DOM.templateFieldsContainer.innerHTML = "";
      template.fields.forEach((field) => {
        const fieldGroup = document.createElement("div");
        fieldGroup.className = "form-group";

        const label = document.createElement("label");
        label.setAttribute("for", `field_${field.name}`);
        label.textContent = field.name;
        if (field.required) {
          const requiredSpan = document.createElement("span");
          requiredSpan.className = "required";
          requiredSpan.textContent = " *";
          label.appendChild(requiredSpan);
        }

        let input;
        switch (field.type) {
          case "boolean":
            const checkboxGroup = document.createElement("div");
            checkboxGroup.className = "checkbox-group";

            input = document.createElement("input");
            input.type = "checkbox";
            input.id = `field_${field.name}`;
            input.name = field.name;

            const checkboxLabel = document.createElement("label");
            checkboxLabel.setAttribute("for", `field_${field.name}`);
            checkboxLabel.textContent = "Yes";

            checkboxGroup.appendChild(input);
            checkboxGroup.appendChild(checkboxLabel);

            fieldGroup.appendChild(label);
            fieldGroup.appendChild(checkboxGroup);
            break;

          case "date":
            input = document.createElement("input");
            input.type = "date";
            input.id = `field_${field.name}`;
            input.name = field.name;
            if (field.required) input.required = true;

            fieldGroup.appendChild(label);
            fieldGroup.appendChild(input);
            break;

          case "number":
            input = document.createElement("input");
            input.type = "number";
            input.id = `field_${field.name}`;
            input.name = field.name;
            if (field.required) input.required = true;

            fieldGroup.appendChild(label);
            fieldGroup.appendChild(input);
            break;

          default: // string
            input = document.createElement("input");
            input.type = "text";
            input.id = `field_${field.name}`;
            input.name = field.name;
            if (field.required) input.required = true;

            fieldGroup.appendChild(label);
            fieldGroup.appendChild(input);
        }

        if (field.description) {
          const helpText = document.createElement("p");
          helpText.className = "help-text";
          helpText.textContent = field.description;
          fieldGroup.appendChild(helpText);
        }

        DOM.templateFieldsContainer.appendChild(fieldGroup);
      });

      // Move to next step
      this.updateIssuanceStep("fill");
    } catch (error) {
      console.error("Error loading template details:", error);
      alert("Failed to load template details. Please try again.");
    }
  },

  async handleIssueFormSubmit(event) {
    event.preventDefault();

    try {
      // Gather form data
      const formData = {};
      const fields = DOM.templateFieldsContainer.querySelectorAll(
        "input, select, textarea"
      );
      fields.forEach((field) => {
        if (field.type === "checkbox") {
          formData[field.name] = field.checked;
        } else {
          formData[field.name] = field.value;
        }
      });

      // Issue credential
      const result = await API.issueCredential(
        AppState.selectedTemplateId,
        formData
      );
      if (!result) throw new Error("Failed to issue credential");

      // Update UI with result
      DOM.credentialOfferUrl.value = result.offerUrl;

      // Generate QR code
      const qrCodeContainer = document.getElementById("qrCode");
      qrCodeContainer.innerHTML = "";
      new QRCode(qrCodeContainer, {
        text: result.offerUrl,
        width: 200,
        height: 200,
      });

      // Move to final step
      this.updateIssuanceStep("issue");

      // Update stats
      const currentCount = parseInt(DOM.credentialCount.textContent) || 0;
      DOM.credentialCount.textContent = currentCount + 1;
    } catch (error) {
      console.error("Error issuing credential:", error);
      alert("Failed to issue credential. Please try again.");
    }
  },

  copyCredentialUrl() {
    DOM.credentialOfferUrl.select();
    document.execCommand("copy");

    // Show feedback
    DOM.copyUrlBtn.textContent = "Copied!";
    setTimeout(() => {
      DOM.copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i>';
    }, 2000);
  },

  resetIssuanceFlow() {
    // Reset form and selection
    DOM.issueForm.reset();
    DOM.issueTemplateGrid.querySelectorAll(".template-card").forEach((card) => {
      card.classList.remove("selected");
    });
    AppState.selectedTemplateId = null;
    DOM.continueToDetailsBtn.disabled = true;

    // Back to first step
    this.updateIssuanceStep("select");
  },
};

// Initialize app
function initApp() {
  // Set up navigation events
  Object.entries(DOM.navButtons).forEach(([page, btn]) => {
    btn.addEventListener("click", () => {
      // Map "issue" nav button to "issueCredential" page
      if (page === "issue") {
        UI.navigateTo("issueCredential");
      } else {
        UI.navigateTo(page);
      }
    });
  });

  // Set up template page events
  DOM.newTemplateBtn.addEventListener("click", () => {
    UI.resetTemplateForm();
    UI.navigateTo("templateEditor");
  });

  DOM.cancelTemplateBtn.addEventListener("click", () => {
    UI.navigateTo("templates");
  });

  DOM.backToTemplates.addEventListener("click", (e) => {
    e.preventDefault();
    UI.navigateTo("templates");
  });

  DOM.addFieldBtn.addEventListener("click", () => UI.addFieldToForm());

  DOM.templateForm.addEventListener("submit", (e) =>
    UI.handleTemplateFormSubmit(e)
  );

  DOM.templateSearch.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    DOM.templatesList.querySelectorAll(".template-card").forEach((card) => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      const description = card
        .querySelector(".template-description")
        .textContent.toLowerCase();
      const vct = card
        .querySelector(".template-meta")
        .textContent.toLowerCase();

      if (
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        vct.includes(searchTerm)
      ) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });
  DOM.issueTemplateSearch.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    DOM.issueTemplateGrid.querySelectorAll(".template-card").forEach((card) => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      const description = card
        .querySelector(".template-description")
        .textContent.toLowerCase();
      const vct = card
        .querySelector(".template-meta")
        .textContent.toLowerCase();

      if (
        name.includes(searchTerm) ||
        description.includes(searchTerm) ||
        vct.includes(searchTerm)
      ) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    });
  });

  DOM.continueToDetailsBtn.addEventListener("click", () =>
    UI.continueToCredentialDetails()
  );

  DOM.backToSelectBtn.addEventListener("click", () =>
    UI.updateIssuanceStep("select")
  );

  DOM.issueForm.addEventListener("submit", (e) => UI.handleIssueFormSubmit(e));

  DOM.copyUrlBtn.addEventListener("click", () => UI.copyCredentialUrl());

  DOM.issueNewBtn.addEventListener("click", () => UI.resetIssuanceFlow());

  // Set up dashboard events
  document.querySelectorAll(".action-card").forEach((card) => {
    card.addEventListener("click", () => {
      const action = card.dataset.action;
      UI.navigateTo(action);
    });
  });

  // Initial loading
  UI.renderTemplatesList();
  UI.renderIssueTemplateGrid();

  // Mock some stats
  DOM.credentialCount.textContent = "0";
}

// Load app when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
