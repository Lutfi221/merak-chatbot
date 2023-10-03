import { FlowData } from "../types";
import Chatbot from "./Chatbot";
import ChatbotDebugger from "./ChatbotDebugger";
import { Message } from "./types";

/**
 * Helper function to test both Chatbot and ChatbotDebugger.
 */
const doubleC = async (testCallback: (C: typeof Chatbot) => Promise<void>) => {
  await testCallback(Chatbot);
  await testCallback(ChatbotDebugger);
};

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

  await doubleC(async (C) => {
    const chatbot = new C(data);
    const outputs: Message[] = [];
    chatbot.on("output", (msg) => outputs.push(msg));

    await chatbot.start();
    await chatbot.inputAsync("1");
    await chatbot.inputAsync("2");

    expect(outputs).toStrictEqual(["A", "B", "C", "C1", "C", "C2", "C"]);
  });
});

test("Chatbot inputs", async () => {
  const data: FlowData = {
    pages: {
      "/start": [
        {
          input: {
            type: "text",
            var: "user.email",
            pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$",
          },
        },
        {
          input: {
            type: "choice",
            var: "user.eyeColor",
            choices: {
              "1": "Black",
              "2": "Blue",
            },
          },
        },
        {
          input: {
            type: "set",
            var: "user.flag",
            value: false,
          },
        },
      ],
    },
  };

  await doubleC(async (C) => {
    const chatbot = new C(data);

    await chatbot.start();
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
});

test("Chatbot functions", async () => {
  const mock = jest.fn();
  const data: FlowData = {
    pages: {
      "/start": [
        {
          execute: {
            var: "total",
            fn: "add",
            args: ["{{a}}", 100, "{{b}}"],
          },
        },
        {
          execute: {
            fn: "mock",
            args: ["{{car}}"],
          },
        },
        {
          input: {
            var: "_",
            type: "text",
          },
        },
      ],
    },
  };

  await doubleC(async (C) => {
    const chatbot = new C(data, {
      add: (...args: number[]) => args.reduce((partial, a) => partial + a, 0),
      mock: mock,
    });

    chatbot.storage.dictionary.a = 1;
    chatbot.storage.dictionary.b = 2;
    chatbot.storage.dictionary.car = {
      brand: "Ford",
      age: 8,
    };

    await chatbot.start();
    expect(chatbot.storage.dictionary.total).toBe(103);
    expect(chatbot.storage.dictionary.car).toEqual({
      brand: "Ford",
      age: 8,
    });
  });
});
