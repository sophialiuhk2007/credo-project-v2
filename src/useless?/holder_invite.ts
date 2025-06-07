import readline from "readline";
import { initializeBobAgent } from "./holder_init";
import fs from "fs";
import { Agent } from "@credo-ts/core";

export const receiveInvitation = async (
  agent: Agent,
  invitationUrl: string
) => {
  const { outOfBandRecord, connectionRecord } =
    await agent.oob.receiveInvitationFromUrl(invitationUrl);
  return connectionRecord;
};

const run = async () => {
  if (!fs.existsSync("bob_agent_initialized.txt")) {
    console.error("Agent not initialized. Run holder_init.ts first.");
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (q: string) =>
    new Promise<string>((res) => rl.question(q, res));

  const bobAgent = await initializeBobAgent();

  const invitationUrl = await question("Enter the invitation URL: ");
  rl.close();

  console.log("Accepting the invitation as Bob...");
  const connectionRecord = await receiveInvitation(bobAgent, invitationUrl);

  if (connectionRecord) {
    fs.writeFileSync("bob_connection_id.txt", connectionRecord.id, "utf-8");
    console.log("Invitation accepted. Connection ID saved.");
    console.log("Connection state:", connectionRecord.state);
  } else {
    console.error(
      "Failed to receive a valid connection record from the invitation."
    );
    process.exit(1);
  }
};

export default run;
void run();
