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

it("should record inputs and outputs", async () => {
  const chatbot = new Chatbot(base, {
    inputRecordingEnabled: true,
    outputRecordingEnabled: true,
  });
  await chatbot.initialize();

  await chatbot.input("/hello");
  await chatbot.input("/hi");
  await chatbot.input("/hey");
  await chatbot.input("/hai");

  expect(chatbot.inputs).toEqual(["/hello", "/hi", "/hey", "/hai"]);
  expect(chatbot.outputs).toEqual(["hello", "hi", "hey", "hai"]);
});
