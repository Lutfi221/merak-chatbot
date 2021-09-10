import Chatbot from "../Chatbot";
import { Data } from "../index";

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

test("navigation", (done) => {
  const chatbot = new Chatbot(base);
  const outputs: string[] = [];
  chatbot.on("output", (msg) => outputs.push(msg));
  chatbot.initialize();

  expect(chatbot.storage.value).toBeUndefined();

  chatbot.input("/1");
  expect(chatbot.storage.value).toBe(1);
  chatbot.input("/2");
  expect(chatbot.storage.value).toBe(2);
  chatbot.input("/3");
  expect(chatbot.storage.value).toBe(3);

  expect(outputs).toEqual(["0", "1", "0", "2", "0", "3", "4", "5", "0"]);

  chatbot.navigate(null);
  chatbot.input("foo");
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
    done();
  });

  chatbot.input("/err");
});
