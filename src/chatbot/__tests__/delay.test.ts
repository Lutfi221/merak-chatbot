import Chatbot from "../Chatbot";
import { Data } from "../index";

test(
  "step delay",
  async () => {
    const data: Data = {
      pages: {
        "/start": [
          {
            delay: 1,
            content: "a",
          },
          {
            delay: 2,
            content: "b",
          },
          {
            delay: 1.5,
            content: "c",
          },
          {
            userInput: true,
          },
        ],
      },
    };
    const chatbot = new Chatbot(data);
    const expectedOutputs: string[] = ["a", "b", "c"];
    const expectedDelays = [1000, 2000, 1500];

    let lastOutputTime: number;
    let i = 0;

    const handleOutput = jest.fn((output: string) => {
      const time = Date.now();
      expect(Math.abs(time - lastOutputTime) - expectedDelays[i]).toBeLessThan(
        100,
      );
      expect(output).toBe(expectedOutputs[i]);
      i++;
      lastOutputTime = time;
    });
    chatbot.on("output", handleOutput);
    lastOutputTime = Date.now();
    await chatbot.initialize();

    expect(handleOutput.mock.calls.length).toBe(3);
  },
  7 * 1000,
);
