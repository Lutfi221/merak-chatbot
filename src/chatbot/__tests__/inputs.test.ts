import Chatbot from "../Chatbot";
import { Data } from "../index";

const fooBar = { foo: "bar" };
const barFoo = { bar: "foo" };

const choiceInputs: Data = {
  pages: {
    "/start": [
      {
        name: "numberHolder",
        content: "numberHolder",
        values: {
          "1": 1,
          "2": 2,
          "3": 3,
        },
      },
      {
        name: "stringHolder",
        content: "stringHolder",
        values: {
          a: "a",
          b: "b",
          c: "c",
        },
      },
      {
        name: "booleanHolder",
        content: "booleanHolder",
        values: {
          true: true,
          false: false,
        },
      },
      {
        name: "nullHolder",
        content: "nullHolder",
        values: {
          null: null,
        },
      },
      {
        name: "objectHolder",
        content: "objectHolder",
        values: {
          fooBar: fooBar,
          barFoo: barFoo,
        },
      },
    ],
  },
};

test("choice inputs", () => {
  const chatbot = new Chatbot(choiceInputs);
  chatbot.initialize();

  ["1", "a", "true", "null", "fooBar"].map((s) => chatbot.input(s));
  expect(chatbot.storage).toMatchObject({
    numberHolder: 1,
    stringHolder: "a",
    booleanHolder: true,
    nullHolder: null,
    objectHolder: fooBar,
  });

  ["2", "b", "false", "null", "barFoo"].map((s) => chatbot.input(s));
  expect(chatbot.storage).toMatchObject({
    numberHolder: 2,
    stringHolder: "b",
    booleanHolder: false,
    nullHolder: null,
    objectHolder: barFoo,
  });

  chatbot.storage = {};

  /**
   * Try invalid inputs.
   */
  ["9", "1", "a", "9", "tru", "true", "null", "9", "fooBar"].map((s) =>
    chatbot.input(s),
  );
  expect(chatbot.storage).toMatchObject({
    numberHolder: 1,
    stringHolder: "a",
    booleanHolder: true,
    nullHolder: null,
    objectHolder: fooBar,
  });
});

const freeUserInputs: Data = {
  pages: {
    "/start": [
      {
        content: "free numbers",
        name: "freeNumbers",
        userInput: true,
        userInputValidator: "^\\d+$",
        invalidInputMessage: "free numbers invalid",
      },
      {
        content: "free letters",
        name: "freeLetters",
        userInput: true,
        userInputValidator: "^\\D+$",
        invalidInputMessage: "free letters invalid",
      },
      {
        content: "free letters no invalid message",
        name: "freeLettersNoInvalidMessage",
        userInput: true,
        userInputValidator: "^\\D+$",
      },
    ],
  },
};

test("free user inputs", () => {
  const chatbot = new Chatbot(freeUserInputs);
  const outputs: string[] = [];

  chatbot.on("output", (msg) => outputs.push(msg));
  chatbot.initialize();

  chatbot.input("21 ");
  chatbot.input("ab");
  chatbot.input("21");

  chatbot.input("12");
  chatbot.input("ab");

  chatbot.input("cd1");
  chatbot.input("cd");

  expect(outputs).toEqual([
    "free numbers",
    "free numbers invalid",
    "free numbers invalid",
    "free letters",
    "free letters invalid",
    "free letters no invalid message",
    "free letters no invalid message",
    "free numbers",
  ]);

  expect(chatbot.storage).toMatchObject({
    freeNumbers: "21",
    freeLetters: "ab",
    freeLettersNoInvalidMessage: "cd",
  });
});

const inputLinksOverlaps: Data = {
  pages: {
    "/start": {
      name: "initialChoice",
      content: "values + links",
      values: {
        a: "a",
        b: "b",
      },
      links: {
        a: "/a",
        b: "/b",
      },
    },
    "/a": {
      content: "a",
    },
    "/b": [
      {
        content: "b",
      },
      {
        name: "number",
        content: "values + userInput",
        values: {
          a: "1",
          b: "2",
          c: "3",
        },
        userInput: true,
        userInputValidator: "^\\d+$",
      },
      {
        name: "letter",
        content: "values + links + userInput",
        values: {
          a: "a",
          b: "b",
          c: "c",
        },
        links: {
          c: "/end",
        },
        userInput: true,
        userInputValidator: "^[a-z]$",
      },
      {
        // pause, so it doesn't immediately go back to "/start"
        userInput: true,
      },
    ],
    "/end": {
      content: "end",
    },
  },
};

test("inputs overlaps", () => {
  const chatbot = new Chatbot(inputLinksOverlaps);
  const outputs: string[] = [];

  chatbot.on("output", (msg) => outputs.push(msg));
  chatbot.initialize();

  chatbot.input("a");
  expect(chatbot.storage.initialChoice).toBe("a");

  chatbot.input("b");
  expect(chatbot.storage.initialChoice).toBe("b");

  chatbot.input("z");

  chatbot.input("a");
  expect(chatbot.storage.number).toBe("1");

  chatbot.navigate("/b", 1);
  chatbot.input("b");
  expect(chatbot.storage.number).toBe("2");

  chatbot.navigate("/b", 1);
  chatbot.input("c");
  expect(chatbot.storage.number).toBe("3");

  chatbot.navigate("/b", 1);
  chatbot.input("221");
  expect(chatbot.storage.number).toBe("221");

  chatbot.input("a");
  expect(chatbot.storage.letter).toBe("a");

  chatbot.navigate("/b", 2);
  chatbot.input("b");
  expect(chatbot.storage.letter).toBe("b");

  chatbot.navigate("/b", 2);
  chatbot.input("x");
  expect(chatbot.storage.letter).toBe("x");

  chatbot.navigate("/b", 2);
  chatbot.input("c");
  expect(chatbot.storage.letter).toBe("c");

  expect(outputs).toEqual([
    "values + links",
    "a",
    "values + links",
    "b",
    "values + userInput",
    "values + userInput",
    "values + links + userInput",
    "values + links + userInput",
    "values + links + userInput",
    "values + links + userInput",
    "end",
    "values + links",
  ]);
});