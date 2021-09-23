import Chatbot from "../Chatbot";
import { Data } from "../index";

test("forEach function", async () => {
  const data: Data = {
    pages: {
      "/start": [
        {
          name: "employees",
          value: [
            { name: "Lutfi", age: 17 },
            { name: "Joey", age: 21 },
            { name: "John", age: 44 },
          ],
        },
        {
          name: "body",
          execute: {
            function: "forEach",
            args: [
              "employees",
              "\n%humanIndex%. %value.name% age %value.age% [%index%]",
            ],
          },
        },
        {
          content: "results:\n{{body}}",
          userInput: true,
        },
        {
          name: "body",
          execute: {
            function: "forEach",
            args: [
              "employees",
              "\n$humanIndex$. {{employees.$index$.name}} age {{employees.$index$.age}} [$index$]",
              "$",
            ],
          },
        },
        {
          content: "alternative:\n{{body}}",
          userInput: true,
        },
      ],
    },
  };
  const chatbot = new Chatbot(data, { outputRecordingEnabled: true });
  await chatbot.initialize();
  await chatbot.input("continue");
  expect(chatbot.outputs).toEqual([
    `results:\n\n` +
      `1. Lutfi age 17 [0]\n` +
      `2. Joey age 21 [1]\n` +
      `3. John age 44 [2]`,
    `alternative:\n\n` +
      `1. Lutfi age 17 [0]\n` +
      `2. Joey age 21 [1]\n` +
      `3. John age 44 [2]`,
  ]);
});

test("split function", async () => {
  const data: Data = {
    pages: {
      "/start": [
        {
          name: "input",
          value: "the first,second,third",
        },
        {
          name: "list",
          execute: {
            function: "split",
            args: ["{{input}}", ","],
            substituteVariables: true,
          },
        },
        {
          content: "{{list.0}}\n{{list.1}}\n{{list.2}}",
        },
        {
          userInput: true,
        },
      ],
    },
  };
  const chatbot = new Chatbot(data, { outputRecordingEnabled: true });
  await chatbot.initialize();
  expect(chatbot.outputs).toEqual(["the first\nsecond\nthird"]);
});
