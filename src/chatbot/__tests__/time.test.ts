import Chatbot, { Status } from "../Chatbot";
import { Data } from "../index";

test("idle event", (done) => {
  const data: Data = {
    settings: {
      timeThresholdForIdle: 3,
    },
    pages: {
      "/start": [
        {
          content: "start",
        },
        {
          content: "1",
        },
        {
          content: "2",
          userInput: true,
        },
      ],
      "/on-idle": [
        {
          content: "idle 1",
        },
        {
          content: "idle 2",
        },
        {
          next: "{{_continue}}",
        },
      ],
    },
  };
  const chatbot = new Chatbot(data, { outputRecordingEnabled: true });
  const onOutput = jest.fn(() => {
    return Date.now();
  });

  chatbot.on("output", onOutput);

  chatbot.on("idle", (head, step) => {
    expect(head).toMatchObject({ page: "/start", index: 2 });
    expect(step).toMatchObject({ content: "2", userInput: true });

    chatbot.on("status-change", (status) => {
      if (status !== Status.WaitingInput) return;
      /**
       * So it wouldn't go idle again.
       */
      chatbot.exit();
      expect(chatbot.outputs).toEqual([
        "start",
        "1",
        "2",
        "idle 1",
        "idle 2",
        "2",
      ]);
      const timeTookToTriggerIdle =
        onOutput.mock.results[3].value - onOutput.mock.results[2].value;
      expect(timeTookToTriggerIdle - 3 * 1000).toBeLessThan(100);
      done();
    });
  });

  chatbot.initialize();
});
