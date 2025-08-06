import { initializeAcmeAgentIssuer } from "./issuer_config";
import { OpenId4VcIssuerApi } from "@credo-ts/openid4vc";

async function listAllIssuers() {
  // Initialize a new issuer agent
  const agent = await initializeAcmeAgentIssuer();

  // Get the OpenId4VcIssuerApi instance from your agent
  const openId4VcIssuerApi = agent.modules
    .openId4VcIssuer as OpenId4VcIssuerApi;

  // Fetch all issuer records
  const issuers = await openId4VcIssuerApi.getAllIssuers();

  if (!issuers.length) {
    console.log("No issuers found.");
    return;
  }

  issuers.forEach((issuer, idx) => {
    console.log(`Issuer #${idx + 1}:`);
    console.log(`  Issuer ID: ${issuer.issuerId}`);
    console.log(issuer);
    console.log("----");
  });

  // Optional: shut down the agent if needed
  if (agent.shutdown) await agent.shutdown();
}

listAllIssuers().catch(console.error);
