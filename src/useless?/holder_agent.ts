import { initializeBobAgent, receiveInvitation } from "../holder_config";
import readline from "readline";

export const initAndConnect = async () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const question = (q: string) =>
    new Promise<string>((res) => rl.question(q, res));

  console.log("Initializing Bob agent...");
  const bobAgent = await initializeBobAgent();

  const invitationUrl = await question("Enter the invitation URL: ");
  console.log("Accepting the invitation as Bob...");
  await receiveInvitation(bobAgent, invitationUrl);

  rl.close();
  return bobAgent;
};
