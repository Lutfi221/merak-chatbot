import { FlowData } from "../types";
import Chatbot from "./Chatbot";
import { Message } from "./types";

test("Basic", async () => {
  const data: FlowData = {
    pages: {
      "/start": [
        {
          msg: "A",
        },
        {
          msg: "B",
          next: "/choice",
        },
      ],
      "/choice": [
        {
          msg: "C",
          links: {
            "1": "/links[0]",
            "2": "/links[1]",
          },
        },
      ],
      "/links": [
        {
          msg: "C1",
          next: "/choice",
        },
        {
          msg: "C2",
          next: "/choice",
        },
      ],
    },
  };
  const chatbot = new Chatbot(data);
  const outputs: Message[] = [];
  chatbot.on("output", (msg) => outputs.push(msg));

  await chatbot.initialize();
  await chatbot.inputAsync("1");
  await chatbot.inputAsync("2");

  expect(outputs).toStrictEqual(["A", "B", "C", "C1", "C", "C2", "C"]);
});

test("Chatbot inputs", async () => {
  const chatbot = new Chatbot({
    pages: {
      "/start": [
        {
          input: {
            type: "text",
            name: "user.email",
            pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
          },
        },
        {
          input: {
            type: "choice",
            name: "user.eyeColor",
            choices: {
              "1": "Black",
              "2": "Blue",
            },
          },
        },
        {
          input: {
            type: "set",
            name: "user.flag",
            value: false,
          },
        },
      ],
    },
  });

  await chatbot.initialize();
  await chatbot.inputAsync("invalid@emailcom");
  await chatbot.inputAsync("valid@email.com");
  await chatbot.inputAsync("99");
  await chatbot.inputAsync("1");

  expect(chatbot.storage.dictionary).toEqual({
    user: {
      email: "valid@email.com",
      eyeColor: "Black",
      flag: false,
    },
  });
});
