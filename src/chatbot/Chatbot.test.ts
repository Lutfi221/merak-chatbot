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
