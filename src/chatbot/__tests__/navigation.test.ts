import Chatbot, { Status } from "../Chatbot";
import { Data, Step } from "../index";
import { FreefallError, StatusError } from "../errors";

const base: Data = {
  pages: {
    "/start": {
      name: "value",
      content: "0",
      links: {
        "/1": "/1",
        "/2": "/2",
        "/3": "/3",
        "/err": "/err",
      },
      /**
       * These values shouldn't affect
       * the navigation.
       */
      values: {
        "/1": 1,
        "/2": 2,
        "/3": 3,
      },
    },
    "/1": {
      content: "1",
    },
    "/2": {
      content: "2",
    },
    "/3": {
      content: "3",
      next: "/4",
    },
    "/4": {
      content: "4",
      next: "/5[1]",
    },
    "/5": [{ content: "This step should be skipped" }, { content: "5" }],
    "/err": { next: "/page_does_not_exists" },
  },
};

test("navigation", () => {
  return new Promise<void>(async (res) => {
    const chatbot = new Chatbot(base);
    const outputs: string[] = [];
    chatbot.on("output", (msg) => outputs.push(msg));
    await chatbot.initialize();

    expect(chatbot.storage.value).toBeUndefined();

    await chatbot.input("/1");
    expect(chatbot.storage.value).toBe(1);
    await chatbot.input("/2");
    expect(chatbot.storage.value).toBe(2);
    await chatbot.input("/3");
    expect(chatbot.storage.value).toBe(3);

    expect(outputs).toEqual(["0", "1", "0", "2", "0", "3", "4", "5", "0"]);

    chatbot.navigate(null);
    await chatbot.input("foo");
    expect(chatbot.getPrompt()).toBe("0");

    /**
     * To prevent jest from saying unhandled error
     */
    chatbot.on("error", (err) => err);

    chatbot.once("error", (err) => {
      /**
       * To prevent jest from saying unhandled error
       */
      err;
      res();
    });

    await chatbot.input("/err");
  });
});

const defaultLinkData: Data = {
  pages: {
    "/start": [
      {
        content: "start",
        links: {
          "1": "/1",
        },
        defaultLink: "/default",
      },
      {
        content: "This page should not be reached.",
      },
    ],
    "/1": {
      content: "1",
    },
    "/default": {
      content: "default",
    },
  },
};

test("defaultLink", async () => {
  const chatbot = new Chatbot(defaultLinkData, {
    outputRecordingEnabled: true,
  });
  await chatbot.initialize();

  await chatbot.input("1");
  await chatbot.input("non-matching input");
  expect(chatbot.outputs).toEqual(["start", "1", "start", "default", "start"]);
});

const navigateAndRunData: Data = {
  pages: {
    "/start": {
      name: "_",
      content: "waiting input",
      userInput: true,
    },
    "/run": [
      {
        content: "1",
      },
      {
        content: "2",
      },
      {
        name: "_",
        content: "stop",
        userInput: true,
      },
    ],
  },
};

test("navigateAndRun", () => {
  return new Promise<void>(async (res) => {
    const chatbot = new Chatbot(navigateAndRunData, {
      outputRecordingEnabled: true,
    });
    await chatbot.initialize();
    await chatbot.navigateAndRun("/run");
    expect(chatbot.outputs).toEqual(["waiting input", "1", "2", "stop"]);

    chatbot.once("error", (error) => {
      expect(error).toBeInstanceOf(StatusError);
    });

    chatbot.once("status-change", () => {
      expect(() => chatbot.navigateAndRun("/start")).rejects.toThrowError(
        StatusError,
      );
      res();
    });

    chatbot.input("get busy");
  });
});

it("should detect freefall", async () => {
  const steps = [];
  for (var i = 0; i < 40; ++i) {
    const step: Step = {
      content: `falls-through ${i}`,
    };
    if (i % 10 === 0) {
      step.name = "number";
      step.value = 123;
    }
    steps.push(step);
  }

  const data = { pages: { "/start": steps } };

  let chatbot = new Chatbot(data, { freefallLimit: 25 });
  let mockErrorHandler = jest.fn((error: Error) => {
    expect(error).toBeInstanceOf(FreefallError);
    expect((error as FreefallError).freefallAmount).toBe(25);
  });

  chatbot.on("error", mockErrorHandler);
  await chatbot.initialize();

  expect(chatbot.status).toBe(Status.WaitingInput);
  expect(chatbot.head).toMatchObject({
    page: null,
    index: 0,
    stepsAmount: 0,
  });
  expect(mockErrorHandler.mock.calls.length).toBe(1);
});
