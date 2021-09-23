import Chatbot from "../Chatbot";
import { Data } from "../index";

const base: Data = {
  triggers: {
    "/hello": "/hello",
    "/hi": "/hi",
    "/Hey": "/hey",
    "/HAI": "/hai",
  },
  pages: {
    "/hello": {
      content: "hello",
    },
    "/hi": {
      content: "hi",
    },
    "/hey": {
      content: "hey",
    },
    "/hai": {
      content: "hai",
    },
  },
};

test("case-insensitive triggers", async () => {
  const data = base;
  const chatbot = new Chatbot(data);
  const outputs: string[] = [];

  chatbot.initialize();

  expect(chatbot.getPrompt()).toBe("");

  chatbot.on("output", (msg) => {
    outputs.push(msg);
  });

  await chatbot.input("/hello");
  await chatbot.input("/hi");
  await chatbot.input("/hey");
  await chatbot.input("/hai");

  await chatbot.input("/HELLO");
  await chatbot.input("/HI");
  await chatbot.input("/HEY");
  await chatbot.input("/HAI");

  expect(outputs).toEqual([
    "hello",
    "hi",
    "hey",
    "hai",
    "hello",
    "hi",
    "hey",
    "hai",
  ]);
});

test("case-sensitive triggers", async () => {
  const data = { ...base };
  data.settings = { caseSensitiveTrigger: true };

  const chatbot = new Chatbot(data);
  let outputs: string[] = [];

  chatbot.initialize();

  chatbot.on("output", (msg) => {
    outputs.push(msg);
  });

  await chatbot.input("/hello");
  await chatbot.input("/hi");
  /**
   * The inputs below should not
   * match against the triggers.
   */
  await chatbot.input("/hey");
  await chatbot.input("/hai");

  await chatbot.input("/HELLO");
  await chatbot.input("/HI");
  await chatbot.input("/HEY");
  /**
   * The inputs below should match.
   */
  await chatbot.input("/HAI");
  await chatbot.input("/Hey");

  expect(outputs).toEqual(["hello", "hi", "hai", "hey"]);
});
