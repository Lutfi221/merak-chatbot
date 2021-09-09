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

test("case-insensitive triggers", () => {
  const data = base;
  const chatbot = new Chatbot(data);
  const outputs: string[] = [];

  chatbot.initialize();

  expect(chatbot.getPrompt()).toBe("");

  chatbot.on("output", (msg) => {
    outputs.push(msg);
  });

  chatbot.input("/hello");
  chatbot.input("/hi");
  chatbot.input("/hey");
  chatbot.input("/hai");

  chatbot.input("/HELLO");
  chatbot.input("/HI");
  chatbot.input("/HEY");
  chatbot.input("/HAI");

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

test("case-sensitive triggers", () => {
  const data = { ...base };
  data.settings = { caseSensitiveTrigger: true };

  const chatbot = new Chatbot(data);
  let outputs: string[] = [];

  chatbot.initialize();

  chatbot.on("output", (msg) => {
    outputs.push(msg);
  });

  chatbot.input("/hello");
  chatbot.input("/hi");
  /**
   * The inputs below should not
   * match against the triggers.
   */
  chatbot.input("/hey");
  chatbot.input("/hai");

  chatbot.input("/HELLO");
  chatbot.input("/HI");
  chatbot.input("/HEY");
  /**
   * The inputs below should match.
   */
  chatbot.input("/HAI");
  chatbot.input("/Hey");

  expect(outputs).toEqual(["hello", "hi", "hai", "hey"]);
});
