import Chatbot from "../Chatbot";
import { Data } from "../index";
import { InvalidSimulatedInputError } from "../errors";

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

test("choice inputs", async () => {
  const chatbot = new Chatbot(choiceInputs);
  await chatbot.initialize();

  let inputs = ["1", "a", "true", "null", "fooBar"];
  for (let input of inputs) {
    await chatbot.input(input);
  }
  expect(chatbot.storage).toMatchObject({
    numberHolder: 1,
    stringHolder: "a",
    booleanHolder: true,
    nullHolder: null,
    objectHolder: fooBar,
  });

  inputs = ["2", "b", "false", "null", "barFoo"];
  for (let input of inputs) {
    await chatbot.input(input);
  }
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
  inputs = ["9", "1", "a", "9", "tru", "true", "null", "9", "fooBar"];
  for (let input of inputs) {
    await chatbot.input(input);
  }
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

test("free user inputs", async () => {
  const chatbot = new Chatbot(freeUserInputs);
  const outputs: string[] = [];

  chatbot.on("output", (msg) => outputs.push(msg));
  await chatbot.initialize();

  await chatbot.input("21 ");
  await chatbot.input("ab");
  await chatbot.input("21");

  await chatbot.input("12");
  await chatbot.input("ab");

  await chatbot.input("cd1");
  await chatbot.input("cd");

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

const noNameInputs: Data = {
  pages: {
    "/start": [
      {
        content: "0",
        userInput: true,
      },
      {
        content: "1",
        values: {
          "1": 1,
          "2": 2,
        },
      },
      {
        content: "2",
        userInput: true,
      },
    ],
  },
};

it("should handle inputs with no name", async () => {
  const chatbot = new Chatbot(noNameInputs, { outputRecordingEnabled: true });
  await chatbot.initialize();
  await chatbot.input("hello");
  await chatbot.input("3");
  await chatbot.input("1");

  expect(chatbot.outputs).toEqual(["0", "1", "1", "2"]);
});

const simulatedInputs: Data = {
  pages: {
    "/start": [
      {
        name: "name",
        userInput: true,
        clearVariables: true,
      },
      {
        name: "height",
        simulateInput: "{{name}}",
        values: {
          Marco: "tall",
          Polo: "short",
        },
        defaultValue: "unknown",
      },
      {
        content: "{{name}}'s height is {{height}}",
      },
      {
        simulateInput: "{{name}}",
        links: {
          Marco: "/marco",
          Polo: "/polo",
        },
        defaultLink: "/start[4]",
      },
      {
        content: "Who are you {{name}}?",
      },
    ],
    "/marco": {
      content: "Marco's page",
    },
    "/polo": {
      content: "Polo's page",
    },
  },
};

it("should handle simulated inputs", async () => {
  const chatbot = new Chatbot(simulatedInputs, {
    outputRecordingEnabled: true,
    inputRecordingEnabled: true,
  });
  await chatbot.initialize();

  /**
   * Marco
   */
  await chatbot.input("Marco");
  expect(chatbot.outputs).toEqual(["Marco's height is tall", "Marco's page"]);
  expect(chatbot.inputs).toEqual(["Marco"]);
  chatbot.outputs = [];

  /**
   * Polo
   */
  await chatbot.input("Polo");
  expect(chatbot.outputs).toEqual(["Polo's height is short", "Polo's page"]);
  chatbot.outputs = [];

  /**
   * Greg
   */
  await chatbot.input("Greg");
  expect(chatbot.outputs).toEqual([
    "Greg's height is unknown",
    "Who are you Greg?",
  ]);
});

const invalidSimulatedInputs: Data = {
  pages: {
    "/start": [
      {
        name: "number",
        value: 9,
      },
      {
        content: "1",
        simulateInput: "invalid input",
        userInput: true,
        userInputValidator: "^\\d+$",
      },
      {
        content: "2",
        simulateInput: "{{number}}",
        values: {
          "1": 1,
          "2": 2,
        },
        links: {
          "1": "/1",
          "2": "/2",
        },
      },
      {
        content: "3",
        userInput: true,
      },
    ],
  },
};

it("should handle invalid simulated inputs", async () => {
  const chatbot = new Chatbot(invalidSimulatedInputs, {
    outputRecordingEnabled: true,
  });
  const mockErrorHandler = jest.fn((error: Error) => {
    expect(error).toBeInstanceOf(InvalidSimulatedInputError);
    expect((error as InvalidSimulatedInputError).page).toBe(chatbot.head.page);
    expect((error as InvalidSimulatedInputError).index).toBe(
      chatbot.head.index,
    );
  });

  chatbot.on("error", mockErrorHandler);
  await chatbot.initialize();

  expect(chatbot.outputs).toEqual(["1", "2", "3"]);
  expect(mockErrorHandler.mock.calls.length).toBe(2);
});

test("inputs overlaps", async () => {
  const chatbot = new Chatbot(inputLinksOverlaps);
  const outputs: string[] = [];

  chatbot.on("output", (msg) => outputs.push(msg));
  await chatbot.initialize();

  await chatbot.input("a");
  expect(chatbot.storage.initialChoice).toBe("a");

  await chatbot.input("b");
  expect(chatbot.storage.initialChoice).toBe("b");

  await chatbot.input("z");

  await chatbot.input("a");
  expect(chatbot.storage.number).toBe("1");

  chatbot.navigate("/b", 1);
  await chatbot.input("b");
  expect(chatbot.storage.number).toBe("2");

  chatbot.navigate("/b", 1);
  await chatbot.input("c");
  expect(chatbot.storage.number).toBe("3");

  chatbot.navigate("/b", 1);
  await chatbot.input("221");
  expect(chatbot.storage.number).toBe("221");

  await chatbot.input("a");
  expect(chatbot.storage.letter).toBe("a");

  chatbot.navigate("/b", 2);
  await chatbot.input("b");
  expect(chatbot.storage.letter).toBe("b");

  chatbot.navigate("/b", 2);
  await chatbot.input("x");
  expect(chatbot.storage.letter).toBe("x");

  chatbot.navigate("/b", 2);
  await chatbot.input("c");
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

const defaultValues: Data = {
  pages: {
    "/start": [
      {
        content: "Are you big?",
        name: "height",
        values: {
          yes: "tall",
          no: "short",
        },
        defaultValue: "unknown",
      },
      {
        content: "Your height is {{height}}",
      },
    ],
    "/name": [
      {
        content: "What's your name?",
        name: "name",
        userInput: true,
        userInputValidator: "^[a-zA-Z ]+$",
        /**
         * If the user inputs an invalid name,
         * the name John Doe will be given.
         */
        defaultValue: "John Doe",
      },
      {
        content: "Your name is {{name}}",
        next: "/name",
      },
    ],
  },
};

it("should handle defaultValue", async () => {
  const chatbot = new Chatbot(defaultValues, { outputRecordingEnabled: true });
  await chatbot.initialize();
  await chatbot.input("yes");
  await chatbot.input("no");
  await chatbot.input("don't know");

  await chatbot.navigateAndRun("/name");
  await chatbot.input("The Rock");
  await chatbot.input("John Cena");
  await chatbot.input("invalid-name123");

  expect(chatbot.outputs).toEqual([
    "Are you big?",
    "Your height is tall",
    "Are you big?",
    "Your height is short",
    "Are you big?",
    "Your height is unknown",
    "Are you big?",

    "What's your name?",
    "Your name is The Rock",
    "What's your name?",
    "Your name is John Cena",
    "What's your name?",
    "Your name is John Doe",
    "What's your name?",
  ]);
});
