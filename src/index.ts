import { app, startServer } from "./web_server";
import { initializeAcmeAgentIssuer } from "./issuer_config";

// Add detailed error handling
process.on("uncaughtException", (error) => {
  console.error("CRITICAL ERROR: Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "CRITICAL ERROR: Unhandled rejection at:",
    promise,
    "reason:",
    reason
  );
});

// Initialize the issuer agent on startup
const initializeIssuer = async () => {
  console.log("Initializing the credential issuer agent...");
  try {
    const acmeAgent = await initializeAcmeAgentIssuer();
    console.log("Credential issuer agent initialized successfully.");
    return acmeAgent;
  } catch (error) {
    console.error("Failed to initialize issuer agent:", error);
    return null; // Don't exit, try to start the web server anyway
  }
};

// Start the application
const startApp = async () => {
  try {
    // Initialize the agent first with retry logic
    let agent = null;
    let retries = 3;

    while (retries > 0 && agent === null) {
      try {
        agent = await initializeIssuer();
      } catch (agentError) {
        console.error(
          `Agent initialization error (retries left: ${retries - 1}):`,
          agentError
        );
        retries--;
        if (retries > 0) {
          console.log("Retrying agent initialization...");
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    // Start the web server using our dynamic port function
    const server = await startServer();

    console.log("ACME Credential Issuer is now running!");
  } catch (error) {
    console.error("Failed to start application:", error);
  }
};

// Run the application
startApp().catch((error) => {
  console.error("Failed to start application:", error);
});
