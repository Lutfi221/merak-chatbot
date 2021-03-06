import fs from "fs";
import readline from "readline";
import Chatbot, { Status } from "./chatbot/Chatbot";
import { Data } from "./chatbot";

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

const printTriggers = (triggers: { [trigger: string]: string }) => {
  if (triggers) {
    let triggersMessage = "TRIGGERS: \n";
    for (let trigger in triggers) {
      triggersMessage += trigger + "\n";
    }
    console.log(triggersMessage);
  }
};

const main = () => {
  return new Promise<void>(async (res) => {
    let data: Data;
    let dataLoaded = false;

    console.log(
      "Input chatbot data file path (.json)\n" +
        "Absolute path or relative.\n\n" +
        "examples:\n" +
        '"./samples/shop.json"\n' +
        '"D:\\Projects\\merak-chatbot\\samples\\shop.json"',
    );

    while (!dataLoaded) {
      try {
        const path = await ask();
        data = JSON.parse(fs.readFileSync(path, "utf8")) as Data;
        dataLoaded = true;
      } catch (err) {
        console.error(err);
      }
    }

    const chatbot = new Chatbot(data!, { outputRecordingEnabled: true });
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    rl.setPrompt(" > ");

    if (data!.triggers) printTriggers(data!.triggers);

    chatbot.on("output", (message) => {
      console.log("\n" + message + "\n");
    });

    chatbot.on("status-change", (status) => {
      if (status === Status.WaitingInput) {
        rl.prompt(true);
      }
    });

    chatbot.on("steps-complete", () => {
      if (data.triggers) printTriggers(data.triggers);
    });

    chatbot.on("error", (err) => {
      console.error(err);
    });

    chatbot.on("exit", () => {
      console.log("---CHATBOT EXIT---");
      res();
    });

    rl.on("line", (input) => {
      chatbot.input(input);
    });

    chatbot.initialize();
  });
};

const loop = async () => {
  while (true) {
    await main();
  }
};

loop();
