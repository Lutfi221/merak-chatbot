import Chatbot from "../Chatbot";
import { Data } from "../index";

const base: Data = {
  pages: {
    "/start": [
      {
        content: "{{letter}};{{number}};{{boolean}};{{null}};{{word}}",
      },
      {
        name: "letter",
        value: "a",
      },
      {
        name: "number",
        value: 2,
      },
      {
        name: "boolean",
        value: true,
      },
      {
        name: "null",
        value: null,
      },
      {
        name: "word",
        userInput: true,
      },
    ],
  },
};

test("variables formatting", () => {
  const chatbot = new Chatbot(base);
  const outputs: string[] = [];

  chatbot.on("output", (msg) => outputs.push(msg));
  chatbot.initialize();

  chatbot.input("hello");

  expect(outputs).toEqual([";;;;", "a;2;true;null;hello"]);
});
