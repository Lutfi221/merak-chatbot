import Chatbot from "../Chatbot";
import { Data } from "../index";

const base: Data = {
  pages: {
    "/start": [
      {
        content: "{{letter}};{{number}};{{boolean}};{{null}};{{word}}",
      },
      {
        name: "letter",
        value: "a",
      },
      {
        name: "number",
        value: 2,
      },
      {
        name: "boolean",
        value: true,
      },
      {
        name: "null",
        value: null,
      },
      {
        name: "word",
        userInput: true,
      },
    ],
  },
};

test("variables formatting", () => {
  const chatbot = new Chatbot(base);
  const outputs: string[] = [];

  chatbot.on("output", (msg) => outputs.push(msg));
  chatbot.initialize();

  chatbot.input("hello");

  expect(outputs).toEqual([";;;;", "a;2;true;null;hello"]);
});

it("should format variables in a nested object", () => {
  const obj = {
    name: "{{name}}",
    aliases: ["{{aliases.0}}", "{{aliases.1}}", "{{aliases.2}}"],
    age: "{{age}}",
    _foo: "foo",
    appearance: {
      eyeColor: "{{eyeColor}}",
      hairColor: "{{hairColor}}",
      _bar: ["bar"],
      dimensions: {
        height: "{{height}}",
        width: "{{width}}",
        _foobar: "foobar",
      },
    },
  };
  const storage = {
    name: "Paijo",
    aliases: ["big man", "The one", "The great"],
    age: 16,
    eyeColor: "brown",
    hairColor: "blonde",
    height: 187,
    width: 30,
  };
  const chatbot = new Chatbot({ pages: {} });
  chatbot.storage = storage;

  expect(chatbot.substituteVariables(obj)).toMatchObject({
    name: storage.name,
    aliases: storage.aliases,
    age: storage.age.toString(),
    _foo: "foo",
    appearance: {
      eyeColor: storage.eyeColor,
      hairColor: storage.hairColor,
      _bar: ["bar"],
      dimensions: {
        height: storage.height.toString(),
        width: storage.width.toString(),
        _foobar: "foobar",
      },
    },
  });
});

it("should not mutate the original object", () => {
  const aliases = ["big man", "The one", "The great"];
  const aliasesUnformatted = [
    "{{aliases.0}}",
    "{{aliases.1}}",
    "{{aliases.2}}",
  ];
  const obj = {
    name: "{{name}}",
    aliases: aliasesUnformatted,
    appearance: {
      eyeColor: "{{eyeColor}}",
      hairColor: "{{hairColor}}",
    },
  };

  const chatbot = new Chatbot({ pages: {} });
  chatbot.storage = {
    name: "Paijo",
    aliases: aliases,
    eyeColor: "brown",
    hairColor: "blonde",
  };

  expect(chatbot.substituteVariables(obj)).toMatchObject({
    name: "Paijo",
    aliases: aliases,
  });
  expect(obj.name).toBe("{{name}}");
  expect(obj.aliases[1]).toBe("{{aliases.1}}");
  expect(obj.appearance.eyeColor).toBe("{{eyeColor}}");
  expect(obj.appearance.hairColor).toBe("{{hairColor}}");
});

it("should accept arrays", () => {
  const aliases = ["big man", "The one", "The great"];
  const aliasesUnformatted = [
    "{{aliases.0}}",
    "{{aliases.1}}",
    "{{aliases.2}}",
  ];
  const chatbot = new Chatbot({ pages: {} });
  chatbot.storage = { aliases: aliases };

  expect(chatbot.substituteVariables(aliasesUnformatted)).toMatchObject(
    aliases,
  );
});

test("global variables", () => {
  const chatbot = new Chatbot(base, { outputRecordingEnabled: true });
  chatbot.globalStorage = {
    letter: "z",
    number: 9,
    boolean: false,
    null: null,
    word: "from global",
  };
  chatbot.initialize();
  chatbot.input("from local");
  /**
   * Simulate 'clearVariables'
   */
  chatbot.storage = {};
  chatbot.input("zoink");

  expect(chatbot.outputs).toEqual([
    "z;9;false;null;from global",
    "a;2;true;null;from local",
    "z;9;false;null;zoink",
  ]);
});
