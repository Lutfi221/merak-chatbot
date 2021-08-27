import fs from "fs";
import readline from "readline";
import Chatbot, { Status } from "./chatbot/Chatbot";

/**
 * Ask for user's input
 */
const ask = (q?: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  let query = " > ";
  if (q) {
    query = "\n" + q + "\n\n>";
  }

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
};

const main = async () => {
  const path = await ask("Input chatbot data file path (.json)");
  const data = JSON.parse(fs.readFileSync(path, "utf8"));

  const chatbot = new Chatbot(data);

  chatbot.on("output", (message) => {
    console.log("\n" + message + "\n");
  });

  chatbot.on("status-change", async (status) => {
    if (status !== Status.WaitingInput) return;
    chatbot.input(await ask());
  });

  chatbot.initialize();
};

main();
