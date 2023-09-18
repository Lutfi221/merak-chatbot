import { FlowData } from "../types";
import Chatbot from "./Chatbot";
import { Message } from "./types";

test("Basic chatbot test", async () => {
  const data: FlowData = {
    pages: {
      "/start": [
        {
          message: "A",
        },
        {
          message: "B",
          next: "/choice",
        },
      ],
      "/choice": [
        {
          message: "C",
          links: {
            "1": "/links[0]",
            "2": "/links[1]",
          },
        },
      ],
      "/links": [
        {
          message: "C1",
          next: "/choice",
        },
        {
          message: "C2",
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
