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
