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
    issueCredential: document.getElementById("issueBtn"),
    verifierScreen: document.getElementById("verifierBtn"),
  },
  pageTitle: document.getElementById("currentPageTitle"),
  pages: {
    home: document.getElementById("home"),
    templates: document.getElementById("templates"),
    templateEditor: document.getElementById("templateEditor"),
    pkpassDesigner: document.getElementById("pkpassDesigner"),
    issueCredential: document.getElementById("issueCredential"),
    verifierScreen: document.getElementById("verifierScreen"),
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
async function sha256Hex(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function prettifyLabel(str) {
  return toTitleCase(str.replace(/([A-Z])/g, " $1").replace(/_/g, " "));
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
      const method = exists ? "PUT" : "POST";
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

      // --- Populate pkpass fields if present ---
      if (template.pkpass) {
        // Thumbnail
        if (template.pkpass.thumbnailBase64) {
          const preview = document.getElementById("pkpassThumbnailPreview");
          preview.src =
            "data:image/jpeg;base64," + template.pkpass.thumbnailBase64;
          preview.style.display = "block";
          pkpassThumbnailBase64 = template.pkpass.thumbnailBase64;
        }
        if (template.pkpass.logoBase64) {
          const preview = document.getElementById("pkpassLogoPreview");
          preview.src = "data:image/jpeg;base64," + template.pkpass.logoBase64;
          preview.style.display = "block";
          pkpassLogoBase64 = template.pkpass.logoBase64;
        }
        // Colors, logo, description
        document.getElementById("pkpassBackgroundColor").value =
          template.pkpass.backgroundColor || "#ffffff";
        document.getElementById("pkpassTextColor").value =
          template.pkpass.textColor || "#000000";
        document.getElementById("pkpassLogoText").value =
          template.pkpass.logoText || "";
        document.getElementById("pkpassDescription").value =
          template.pkpass.description || "";

        // Clear and repopulate pkpass fields
        const pkpassFieldsContainer = document.getElementById(
          "pkpassFieldsContainer"
        );
        pkpassFieldsContainer.innerHTML = "";
        // Helper to add pkpass fields
        function addPkpassFieldGroup(type, fieldObj) {
          UI.createPkpassField(type);
          // Find the last added group
          const groups = pkpassFieldsContainer.querySelectorAll(
            ".pkpass-field-group"
          );
          const group = groups[groups.length - 1];
          group.querySelector('input[type="text"]').value =
            fieldObj.label || "";
          // Set value (static or field)
          const valueInput = group.querySelectorAll('input[type="text"]')[1];
          const select = group.querySelector("select");
          if (fieldObj.value?.type === "static") {
            valueInput.value = fieldObj.value.value;
            select.value = "";
          } else if (fieldObj.value?.type === "field") {
            valueInput.value = "";
            select.value = fieldObj.value.value;
          } else {
            valueInput.value = "";
            select.value = "";
          }
        }
        // Add primary, secondary, auxiliary fields
        (template.pkpass.primary || []).forEach((f) =>
          addPkpassFieldGroup("primary", f)
        );
        (template.pkpass.secondary || []).forEach((f) =>
          addPkpassFieldGroup("secondary", f)
        );
        (template.pkpass.auxiliary || []).forEach((f) =>
          addPkpassFieldGroup("auxiliary", f)
        );
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
    const requiredCheckbox = fieldNode.querySelector(".field-required");
    const requiredLabel = fieldNode.querySelector(
      'label[for^="field-required-"]'
    );
    const selectiveCheckbox = fieldNode.querySelector(".field-selective");
    const selectiveLabel = fieldNode.querySelector(
      'label[for^="field-selective-"]'
    );

    if (requiredCheckbox) requiredCheckbox.id = `field-required-${fieldId}`;
    if (requiredLabel)
      requiredLabel.setAttribute("for", `field-required-${fieldId}`);
    if (selectiveCheckbox) selectiveCheckbox.id = `field-selective-${fieldId}`;
    if (selectiveLabel)
      selectiveLabel.setAttribute("for", `field-selective-${fieldId}`);

    // If editing an existing field, fill in the values
    if (fieldData) {
      const fieldElement = fieldNode.querySelector(".field-item");
      fieldElement.querySelector(".field-name").value = fieldData.name;
      fieldElement.querySelector(".field-type").value = fieldData.type;
      fieldElement.querySelector(".field-description").value =
        fieldData.description || "";
      fieldElement.querySelector(".field-required").checked =
        fieldData.required || false;
      fieldElement.querySelector(".field-selective").checked =
        fieldData.selectivelyDisclosable || false;
      fieldElement.querySelector(".field-title").textContent = fieldData.name;
    }

    // Add remove event listener for the X button
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
      const name = toTitleCase(rawName);

      const camelName = toCamelCaseWithCap(name);

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
        // Preserve existing pkpass design if editing
        pkpass:
          AppState.currentTemplate && AppState.currentTemplate.pkpass
            ? AppState.currentTemplate.pkpass
            : undefined,
      };

      // Gather fields data
      const fieldElements = DOM.fieldsContainer.querySelectorAll(".field-item");
      fieldElements.forEach((fieldEl) => {
        const originalName = fieldEl.querySelector(".field-name").value;
        const camelName = toCamelCaseWithCap(originalName);
        templateData.fields.push({
          name: camelName,
          label: originalName, // Store the original for display
          type: fieldEl.querySelector(".field-type").value,
          description: fieldEl.querySelector(".field-description").value,
          required: fieldEl.querySelector(".field-required").checked,
          selectivelyDisclosable:
            fieldEl.querySelector(".field-selective").checked,
        });
      });

      // ...after saving the template:
      const savedTemplate = await API.saveTemplate(templateData);
      if (!savedTemplate) throw new Error("Failed to save template");

      AppState.currentTemplate = savedTemplate; // <-- set this before navigating

      alert(`Template "${savedTemplate.name}" saved successfully!`);
      await this.renderTemplatesList();
      await this.renderIssueTemplateGrid();
      this.navigateTo("pkpassDesigner");
      populatePkpassFieldDropdowns(); // <-- call directly here
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
        label.textContent = field.label
          ? prettifyLabel(field.label)
          : prettifyLabel(field.name);
        if (field.required) {
          const requiredSpan = document.createElement("span");
          requiredSpan.className = "required";
          requiredSpan.textContent = " *";
          label.appendChild(requiredSpan);
        } else {
          const optionalSpan = document.createElement("span");
          optionalSpan.className = "optional";
          optionalSpan.textContent = " (optional)";
          label.appendChild(optionalSpan);
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
            if (field.required) {
              input.required = true;
            }

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

  async copyCredentialUrl() {
    try {
      await navigator.clipboard.writeText(DOM.credentialOfferUrl.value);

      // Show feedback
      DOM.copyUrlBtn.textContent = "Copied!";
      setTimeout(() => {
        DOM.copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i>';
      }, 2000);
    } catch (err) {
      // Fallback for browsers that do not support navigator.clipboard
      DOM.credentialOfferUrl.select();
      document.execCommand("copy");
      DOM.copyUrlBtn.textContent = "Copied!";
      setTimeout(() => {
        DOM.copyUrlBtn.innerHTML = '<i class="fas fa-copy"></i>';
      }, 2000);
    }
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
  createPkpassField(type) {
    const container = document.createElement("div");
    container.className = "pkpass-field-group";
    container.dataset.type = type;

    // Add field type label
    const typeLabel = document.createElement("label");
    typeLabel.textContent =
      type.charAt(0).toUpperCase() + type.slice(1) + " Field";
    typeLabel.style.fontWeight = "bold";
    typeLabel.style.marginRight = "0.5em";

    // Label input
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = `${
      type.charAt(0).toUpperCase() + type.slice(1)
    } Label`;

    // Value input
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "Custom value";

    // Dropdown for template fields
    const select = document.createElement("select");
    select.innerHTML =
      `<option value="">Customize</option>` +
      (AppState.currentTemplate?.fields || [])
        .map(
          (f) =>
            `<option value="${f.name}">${
              f.label ? prettifyLabel(f.label) : prettifyLabel(f.name)
            }</option>`
        )
        .join("");

    // Remove ("x") button
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "pkpass-remove-btn";
    delBtn.title = "Remove field";
    delBtn.innerHTML = "&times;";
    delBtn.onclick = () => {
      container.remove();
      UI.updatePkpassAddFieldDropdown();
    };

    // --- Input/Dropdown sync logic ---
    valueInput.addEventListener("input", () => {
      if (valueInput.value) {
        select.value = "";
        select.disabled = false;
        valueInput.placeholder = "Custom value";
      }
    });
    select.addEventListener("change", () => {
      if (select.value) {
        valueInput.value = "";
        valueInput.disabled = true;
        // Set placeholder to template field selected
        const selectedOption = select.options[select.selectedIndex];
        valueInput.placeholder =
          selectedOption.textContent || "Template field selected";
      } else {
        valueInput.disabled = false;
        valueInput.placeholder = "Custom value";
      }
    });

    container.appendChild(typeLabel);
    container.appendChild(labelInput);
    container.appendChild(valueInput);
    container.appendChild(select);
    container.appendChild(delBtn);

    document.getElementById("pkpassFieldsContainer").appendChild(container);
    UI.updatePkpassAddFieldDropdown();
  },
  updatePkpassAddFieldDropdown() {
    const counts = { primary: 0, secondary: 0, auxiliary: 0 };
    document
      .querySelectorAll("#pkpassFieldsContainer .pkpass-field-group")
      .forEach((group) => {
        counts[group.dataset.type]++;
      });
    const dropdown = document.getElementById("addPkpassFieldType");
    dropdown.querySelectorAll("option").forEach((opt) => {
      if (!opt.value) return;
      if (
        (opt.value === "primary" && counts.primary >= 1) ||
        (opt.value === "secondary" && counts.secondary >= 2) ||
        (opt.value === "auxiliary" && counts.auxiliary >= 2)
      ) {
        opt.disabled = true;
      } else {
        opt.disabled = false;
      }
    });
  },
};
// --- Required Fields to Disclose ---
const requiredFields = [];
const requiredFieldsList = document.getElementById("requiredFieldsList");
document.getElementById("addRequiredFieldBtn").addEventListener("click", () => {
  const dropdown = document.getElementById("requiredFieldsDropdown");
  let value = dropdown.value;
  if (value && !requiredFields.includes(value)) {
    requiredFields.push(value);
    // Remove the selected option from the dropdown
    dropdown.querySelector(`option[value="${value}"]`).remove();
    renderRequiredFields();
    dropdown.value = "";
  }
});
function renderRequiredFields() {
  requiredFieldsList.innerHTML = "";
  requiredFields.forEach((field, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.gap = "0.5em";
    div.style.marginBottom = "0.5em";
    div.innerHTML = `
      <span class="required-field-label-box">${toTitleCase(
        field.label || field.path || field
      )}</span>
      <button type="button" class="btn secondary-btn" id="setFilterBtn${idx}" style="padding: 0.2em 0.8em; font-size: 0.95em; height: 36px;">Set Filter</button>
      <button type="button" data-idx="${idx}" class="btn icon-btn" title="Remove" style="font-size:1.2em;">&times;</button>
    `;
    div.querySelector(`[data-idx="${idx}"]`).onclick = function () {
      // Remove from requiredFields
      requiredFields.splice(idx, 1);
      // Rebuild the dropdown with all available fields
      updateFieldDropdowns(templateSelect.value);
      // Re-render the required fields list
      renderRequiredFields();
    };
    div.querySelector(`#setFilterBtn${idx}`).onclick = function () {
      showFilterModal(idx);
    };
    requiredFieldsList.appendChild(div);
  });
}
function updateFilterOptionSelect() {
  const type = document.getElementById("filterType").value;
  const select = document.getElementById("filterOptionSelect");
  select.innerHTML = `<option value="">None</option>`;
  (FILTER_OPTIONS_BY_TYPE[type] || []).forEach((opt) => {
    select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
  });
  renderFilterOptionInput("", "");
}
function showFilterModal(idx) {
  const modal = document.getElementById("filterModal");
  modal.style.display = "flex";
  const field = requiredFields[idx];

  // Pre-fill type and filter option if present
  document.getElementById("filterType").value = field.filter?.type || "";

  // Determine which filter option is set
  let selectedOption = "";
  let filterValue = "";
  if (field.filter) {
    for (const key of [
      "const",
      "enum",
      "pattern",
      "minimum",
      "maximum",
      "format",
    ]) {
      if (field.filter[key] !== undefined) {
        selectedOption = key;
        filterValue = field.filter[key];
        break;
      }
    }
  }
  document.getElementById("filterOptionSelect").value = selectedOption;
  renderFilterOptionInput(selectedOption, filterValue);

  // Change input when dropdown changes
  document.getElementById("filterOptionSelect").onchange = function () {
    renderFilterOptionInput(this.value, "");
  };

  document.getElementById("saveFilterBtn").onclick = function () {
    const type = document.getElementById("filterType").value;
    if (!type) {
      alert("Type is required.");
      return;
    }
    const filter = { type };
    const option = document.getElementById("filterOptionSelect").value;
    const input = document.getElementById("filterOptionValue");
    if (option && input) {
      let val = input.value;
      if (option === "enum" || option === "not_enum") {
        val = val
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (val.length === 0)
          return alert("Enum must have at least one value.");
      }
      if (
        ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].includes(
          option
        )
      ) {
        val = Number(val);
        if (isNaN(val)) return alert("Value must be a number.");
      }
      if (option.startsWith("not_")) {
        // Wrap in "not"
        const realKey = option.replace("not_", "");
        filter.not = { [realKey]: val };
      } else if (val !== "" && val !== undefined) {
        filter[option] = val;
      }
    }
    requiredFields[idx] = {
      ...(typeof field === "string" ? { path: field } : field),
      filter,
    };
    modal.style.display = "none";
    renderRequiredFields();
  };
  document.getElementById("closeFilterBtn").onclick = function () {
    modal.style.display = "none";
  };
}

function renderFilterOptionInput(option, value) {
  const container = document.getElementById("filterOptionInput");
  if (!option) {
    container.innerHTML = "";
    return;
  }
  let placeholder = "";
  let inputType = "text";
  if (option === "enum" || option === "not_enum")
    placeholder = "Comma separated values";
  if (
    ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].includes(
      option
    )
  )
    inputType = "number";
  if (option === "const" || option === "not_const") placeholder = "Value";
  container.innerHTML = `<input id="filterOptionValue" type="${inputType}" placeholder="${placeholder}" value="${
    (option === "enum" || option === "not_enum") && Array.isArray(value)
      ? value.join(", ")
      : value || ""
  }">`;
}
// --- On form submit, use the arrays instead of parsing text ---
document
  .getElementById("verifierForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("verificationName").value.trim();
    const purpose = document.getElementById("verificationPurpose").value.trim();

    // Use the arrays directly
    const fields = requiredFields.map((field) => ({
      path: [field.path || field],
      ...(field.filter ? { filter: field.filter } : {}),
    }));
    const idSource = name + purpose + JSON.stringify(fields);

    // Generate robust SHA-256 hashes for IDs
    const definitionId = await sha256Hex(idSource);
    const inputDescriptorId = await sha256Hex(idSource + "input");

    const presentationExchange = {
      definition: {
        id: definitionId,
        name,
        purpose,
        input_descriptors: [
          {
            id: inputDescriptorId,
            constraints: {
              limit_disclosure: "required",
              fields,
            },
          },
        ],
      },
    };

    // Call your backend to create the authorization request
    const res = await fetch("/create-verification-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presentationExchange }),
    });
    const data = await res.json();

    // Show the authorization request link
    document.getElementById("authorizationRequestLink").style.display = "block";
    document.getElementById("authRequestUrl").value =
      data.authorizationRequestUrl || data.invitationUrl || "";
    if (data.verificationSessionId) {
      monitorVerificationSession(data.verificationSessionId);
    }
  });
const originalNavigateTo = UI.navigateTo.bind(UI);
UI.navigateTo = function (page) {
  // If leaving pkpassDesigner, reset its fields
  if (AppState.currentPage === "pkpassDesigner" && page !== "pkpassDesigner") {
    resetPkpassDesignerFields();
  }
  originalNavigateTo(page);
};
let pkpassThumbnailBase64 = "";
let pkpassLogoBase64 = "";

// --- Fetch templates and populate the template selector ---
let templates = [];
const templateSelect = document.getElementById("verifierTemplateSelect");
const requiredFieldsDropdown = document.getElementById(
  "requiredFieldsDropdown"
);
const constFieldDropdown = document.getElementById("constFieldDropdown");

async function loadTemplatesForVerifier() {
  const res = await fetch("/api/templates");
  templates = await res.json();
  // Populate template selector
  templateSelect.innerHTML = `<option value="">Any/All Credentials</option>`;
  templates.forEach((tpl) => {
    templateSelect.innerHTML += `<option value="${tpl.id}">${tpl.name}</option>`;
  });
}
loadTemplatesForVerifier();

// --- Helper to get fields from a template ---
function getTemplateFields(templateId) {
  // Always include these base fields
  const baseFields = [
    { path: "$.id", label: "id" },
    { path: "$.name", label: "name" },
    { path: "$.description", label: "description" },
    { path: "$.vct", label: "vct" },
  ];

  if (!templateId) return baseFields;

  const tpl = templates.find((t) => t.id === templateId);
  if (!tpl || !tpl.fields) return baseFields;

  // Map template fields to { path, label }
  const templateFields = tpl.fields.map((f) => ({
    path: "$." + f.name,
    label: f.name,
  }));

  // Merge, avoiding duplicates by label
  const allFields = [...baseFields];
  templateFields.forEach((f) => {
    if (!allFields.some((bf) => bf.label === f.label)) {
      allFields.push(f);
    }
  });
  return allFields;
}
const FILTER_OPTIONS_BY_TYPE = {
  string: [
    { value: "const", label: "Const (== value)" },
    { value: "not_const", label: "Not Const (!= value)" },
    { value: "enum", label: "Enum (in set)" },
    { value: "not_enum", label: "Not Enum (not in set)" },
  ],
  number: [
    { value: "const", label: "Const (== value)" },
    { value: "not_const", label: "Not Const (!= value)" },
    { value: "minimum", label: "Minimum (≥ value)" },
    { value: "maximum", label: "Maximum (≤ value)" },
    { value: "exclusiveMinimum", label: "Exclusive Minimum (> value)" },
    { value: "exclusiveMaximum", label: "Exclusive Maximum (< value)" },
  ],
  integer: [
    { value: "const", label: "Const (== value)" },
    { value: "not_const", label: "Not Const (!= value)" },
    { value: "minimum", label: "Minimum (≥ value)" },
    { value: "maximum", label: "Maximum (≤ value)" },
    { value: "exclusiveMinimum", label: "Exclusive Minimum (> value)" },
    { value: "exclusiveMaximum", label: "Exclusive Maximum (< value)" },
  ],
  boolean: [
    { value: "const", label: "Const (== true/false)" },
    { value: "not_const", label: "Not Const (!= true/false)" },
  ],
  array: [
    { value: "enum", label: "Enum (contains value)" },
    { value: "not_enum", label: "Not Enum (not contains value)" },
  ],
  object: [],
  null: [],
};

function updateFieldDropdowns(templateId) {
  const fields = getTemplateFields(templateId);

  // Separate base fields and template-specific fields
  const baseFieldPaths = ["$.id", "$.name", "$.description", "$.vct"];
  const baseFields = fields.filter((f) => baseFieldPaths.includes(f.path));
  const templateFields = fields.filter((f) => !baseFieldPaths.includes(f.path));

  // Sort both sections alphabetically by label
  baseFields.sort((a, b) =>
    toTitleCase(a.label).localeCompare(toTitleCase(b.label))
  );
  templateFields.sort((a, b) =>
    toTitleCase(a.label).localeCompare(toTitleCase(b.label))
  );

  // Build dropdown HTML with optgroups
  requiredFieldsDropdown.innerHTML = `<option value="">Select field...</option>`;

  if (baseFields.length) {
    const baseGroup = document.createElement("optgroup");
    baseGroup.label = "Common Fields";
    baseFields.forEach((f) => {
      const option = document.createElement("option");
      option.value = f.path;
      option.textContent = toTitleCase(f.label);
      option.setAttribute("data-label", toTitleCase(f.label));
      baseGroup.appendChild(option);
    });
    requiredFieldsDropdown.appendChild(baseGroup);
  }

  if (templateFields.length) {
    const templateGroup = document.createElement("optgroup");
    templateGroup.label = "Credential-Specific Fields";
    templateFields.forEach((f) => {
      const option = document.createElement("option");
      option.value = f.path;
      option.textContent = toTitleCase(f.label);
      option.setAttribute("data-label", toTitleCase(f.label));
      templateGroup.appendChild(option);
    });
    requiredFieldsDropdown.appendChild(templateGroup);
  }
}
document
  .getElementById("filterType")
  .addEventListener("change", updateFilterOptionSelect);
// --- Update field dropdowns when template changes ---
function populatePkpassFieldDropdowns() {
  const fields =
    (AppState.currentTemplate && AppState.currentTemplate.fields) || [];
  const options = fields
    .map(
      (f) =>
        `<option value="${f.name}">${
          f.label ? prettifyLabel(f.label) : prettifyLabel(f.name)
        }</option>`
    )
    .join("");

  [
    "pkpassPrimaryField",
    "pkpassSecondaryField1",
    "pkpassSecondaryField2",
    "pkpassAuxField1",
    "pkpassAuxField2",
  ].forEach((id) => {
    const select = document.getElementById(id);
    if (select)
      select.innerHTML = `<option value="">-- Select Template Field --</option>${options}`;
  });
}
// Add this function to reset all pkpass designer fields
function resetPkpassDesignerFields() {
  pkpassThumbnailBase64 = "";
  pkpassLogoBase64 = "";
  const pkpassThumbnailPreview = document.getElementById(
    "pkpassThumbnailPreview"
  );
  if (pkpassThumbnailPreview) {
    pkpassThumbnailPreview.src = "";
    pkpassThumbnailPreview.style.display = "none";
  }
  const pkpassLogoPreview = document.getElementById("pkpassLogoPreview");
  if (pkpassLogoPreview) {
    pkpassLogoPreview.src = "";
    pkpassLogoPreview.style.display = "none";
  }
  const pkpassThumbnailInput = document.getElementById("pkpassThumbnail");
  if (pkpassThumbnailInput) pkpassThumbnailInput.value = "";
  const pkpassLogoInput = document.getElementById("pkpassLogo");
  if (pkpassLogoInput) pkpassLogoInput.value = "";
  document.getElementById("pkpassBackgroundColor").value = "#ffffff";
  document.getElementById("pkpassTextColor").value = "#000000";
  document.getElementById("pkpassLogoText").value = "";
  document.getElementById("pkpassDescription").value = "";
  document.getElementById("pkpassFieldsContainer").innerHTML = "";
}

// --- Listen for template selection changes ---
templateSelect.addEventListener("change", function () {
  updateFieldDropdowns(this.value);
  // Optionally clear any previously added required/const fields
  requiredFields.length = 0;
  renderRequiredFields();
});

// --- On page load, initialize dropdowns with default fields ---
updateFieldDropdowns("");
function monitorVerificationSession(verificationSessionId) {
  const poll = async () => {
    try {
      const res = await fetch(
        `/api/verification-session/${verificationSessionId}`
      );
      if (!res.ok)
        throw new Error("Failed to fetch verification session status");
      const data = await res.json();

      // You may want to update the UI here with the current state
      console.log("Verification session state:", data.state);

      if (data.state === "ResponseVerified") {
        alert("Credential successfully verified!");
        // Optionally, display more info or update the UI
        return;
      }

      // If not verified yet, poll again after 2 seconds
      setTimeout(poll, 2000);
    } catch (error) {
      console.error("Error polling verification session:", error);
      setTimeout(poll, 4000); // Retry after a longer delay on error
    }
  };
  poll();
}
// Initialize app
function initApp() {
  // Set up navigation events
  Object.entries(DOM.navButtons).forEach(([page, btn]) => {
    btn.addEventListener("click", () => {
      UI.navigateTo(page);
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
  document
    .getElementById("pkpassForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      // Gather dynamic pkpass fields
      const pkpassFields = Array.from(
        document.querySelectorAll("#pkpassFieldsContainer .pkpass-field-group")
      ).map((group) => {
        const type = group.dataset.type;
        const label = group.querySelector('input[type="text"]').value;
        const valueInput =
          group.querySelectorAll('input[type="text"]')[1].value;
        const selectValue = group.querySelector("select").value;
        let value;
        if (valueInput) value = { type: "static", value: valueInput };
        else if (selectValue) value = { type: "field", value: selectValue };
        else value = { type: "empty", value: "" };
        return { type, label, value };
      });

      // Organize fields by type
      const primary = pkpassFields.filter((f) => f.type === "primary");
      const secondary = pkpassFields.filter((f) => f.type === "secondary");
      const auxiliary = pkpassFields.filter((f) => f.type === "auxiliary");

      // Only reset base64 values if a new pkpass was actually designed (not just navigating away)
      // If editing, preserve the previous base64 values unless the user changed the image
      const pkpassData = {
        thumbnailBase64: pkpassThumbnailBase64,
        logoBase64: pkpassLogoBase64,
        primary,
        secondary,
        auxiliary,
        backgroundColor: document.getElementById("pkpassBackgroundColor").value,
        textColor: document.getElementById("pkpassTextColor").value,
        logoText: document.getElementById("pkpassLogoText").value,
        description: document.getElementById("pkpassDescription").value,
      };

      if (AppState.currentTemplate) {
        AppState.currentTemplate.pkpass = pkpassData;
        await API.saveTemplate(AppState.currentTemplate);
      }

      // --- Reset pkpass designer fields after submit ---
      // Only reset if not editing an existing pkpass (i.e., if AppState.currentTemplate.pkpass was undefined before)
      if (
        !AppState.currentTemplate ||
        !AppState.currentTemplate.pkpass ||
        (!AppState.currentTemplate.pkpass.thumbnailBase64 &&
          !AppState.currentTemplate.pkpass.logoBase64)
      ) {
        pkpassThumbnailBase64 = "";
        pkpassLogoBase64 = "";
        const pkpassThumbnailPreview = document.getElementById(
          "pkpassThumbnailPreview"
        );
        if (pkpassThumbnailPreview) {
          pkpassThumbnailPreview.src = "";
          pkpassThumbnailPreview.style.display = "none";
        }
        const pkpassLogoPreview = document.getElementById("pkpassLogoPreview");
        if (pkpassLogoPreview) {
          pkpassLogoPreview.src = "";
          pkpassLogoPreview.style.display = "none";
        }
        document.getElementById("pkpassThumbnail").value = "";
        document.getElementById("pkpassLogo").value = "";
      }
      document.getElementById("pkpassBackgroundColor").value = "#ffffff";
      document.getElementById("pkpassTextColor").value = "#000000";
      document.getElementById("pkpassLogoText").value = "";
      document.getElementById("pkpassDescription").value = "";
      document.getElementById("pkpassFieldsContainer").innerHTML = "";

      UI.navigateTo("templates");
    });

  document
    .getElementById("pkpassBackBtn")
    .addEventListener("click", function () {
      UI.navigateTo("templateEditor");
    });
  document
    .getElementById("backToTemplateEditor")
    .addEventListener("click", function (e) {
      e.preventDefault();
      UI.navigateTo("templateEditor");
    });
  document
    .getElementById("copyAuthRequestUrl")
    .addEventListener("click", function () {
      const input = document.getElementById("authRequestUrl");
      input.select();
      document.execCommand("copy");
    });
  document
    .getElementById("addPkpassFieldBtn")
    .addEventListener("click", function () {
      const type = document.getElementById("addPkpassFieldType").value;
      if (!type) return;
      UI.createPkpassField(type);
      document.getElementById("addPkpassFieldType").value = "";
    });

  let pkpassThumbnailBase64 = ""; // Add this at the top-level (global in app.js)
  const pkpassThumbnailInput = document.getElementById("pkpassThumbnail");

  if (pkpassThumbnailInput) {
    pkpassThumbnailInput.addEventListener("change", async function (e) {
      const file = e.target.files[0];
      const preview = document.getElementById("pkpassThumbnailPreview");
      if (file) {
        try {
          const options = {
            maxSizeMB: 0.005, // 10 KB
            maxWidthOrHeight: 180,
            useWebWorker: true,
            initialQuality: 0.7,
          };
          // Always await the compression function
          const compressedFile = await window.imageCompression(file, options);

          const reader = new FileReader();
          reader.onload = function (evt) {
            preview.src = evt.target.result;
            preview.style.display = "block";
            pkpassThumbnailBase64 = evt.target.result.split(",")[1];
          };
          reader.readAsDataURL(compressedFile);

          // Optional: log sizes for debugging
          console.log(
            "Original size:",
            file.size,
            "Compressed size:",
            compressedFile.size
          );
        } catch (err) {
          alert("Image compression failed: " + err.message);
          pkpassThumbnailBase64 = "";
          preview.src = "";
          preview.style.display = "none";
        }
      } else {
        preview.src = "";
        preview.style.display = "none";
        pkpassThumbnailBase64 = "";
      }
    });
  }
  let pkpassLogoBase64 = ""; // global variable

  const pkpassLogoInput = document.getElementById("pkpassLogo");

  if (pkpassLogoInput) {
    pkpassLogoInput.addEventListener("change", async function (e) {
      const file = e.target.files[0];
      const preview = document.getElementById("pkpassLogoPreview");
      if (file) {
        try {
          const options = {
            maxSizeMB: 0.005, // 10 KB
            maxWidthOrHeight: 180,
            useWebWorker: true,
            initialQuality: 0.7,
          };
          // Always await the compression function
          const compressedFile = await window.imageCompression(file, options);

          const reader = new FileReader();
          reader.onload = function (evt) {
            preview.src = evt.target.result;
            preview.style.display = "block";
            pkpassLogoBase64 = evt.target.result.split(",")[1]; // <-- THIS LINE
          };
          reader.readAsDataURL(compressedFile);

          // Optional: log sizes for debugging
          console.log(
            "Original size:",
            file.size,
            "Compressed size:",
            compressedFile.size
          );
        } catch (err) {
          alert("Image compression failed: " + err.message);
          pkpassLogoBase64 = "";
          preview.src = "";
          preview.style.display = "none";
        }
      } else {
        preview.src = "";
        preview.style.display = "none";
        pkpassLogoBase64 = "";
      }
    });
  }
  // On page load or navigation to pkpassDesigner, call renderPkpassPreview and updatePkpassAddFieldDropdown
  // (You may want to call these in your navigation logic as well)
}

// Load app when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
