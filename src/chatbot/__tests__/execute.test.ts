import Chatbot from "../Chatbot";
import { Data } from "../index";
import { FunctionNotFoundError } from "../errors";

const multiplyData: Data = {
  pages: {
    "/start": [
      {
        name: "a",
        value: 10,
      },
      {
        name: "b",
        value: 2,
      },
      {
        name: "c",
        value: 3,
      },
      {
        name: "result",
        execute: {
          function: "multiply",
          args: ["{{a}}", "{{b}}", "{{c}}"],
          substituteVariables: true,
        },
      },
      {
        content: "{{result}}",
        userInput: true,
      },
    ],
  },
};

it("should multiply the numbers", (done) => {
  const chatbot = new Chatbot(multiplyData);
  chatbot.registerFunction("multiply", (...nums: string[]) => {
    let result = 1;
    nums.forEach((num) => (result = result * parseInt(num)));
    return result;
  });
  chatbot.once("output", (msg) => {
    expect(msg).toBe("60");
    done();
  });
  chatbot.initialize();
});

const asyncFuncData: Data = {
  pages: {
    "/start": [
      {
        name: "username",
        execute: {
          function: "getName",
        },
      },
      {
        content: "{{username}}",
        userInput: true,
      },
    ],
  },
};

it("should wait for async functions", (done) => {
  const chatbot = new Chatbot(asyncFuncData);
  chatbot.registerFunction("getName", () => {
    return new Promise((res) => {
      setTimeout(() => res("Mark"), 500);
    });
  });
  chatbot.once("output", (msg) => {
    expect(msg).toBe("Mark");
    done();
  });
  chatbot.initialize();
});

const errorData: Data = {
  pages: {
    "/start": [
      {
        execute: {
          function: "throwError",
        },
      },
      {
        execute: {
          function: "nonExistant",
        },
      },
      {
        content: "end",
        userInput: true,
      },
    ],
  },
};

it("should handle errors", (done) => {
  const chatbot = new Chatbot(errorData);
  chatbot.registerFunction("throwError", () => {
    throw new Error("FOO!");
  });

  const mockErrorHandler = jest.fn((err: Error) => {
    err;
  });

  chatbot.on("error", mockErrorHandler);

  chatbot.once("output", () => {
    expect(mockErrorHandler.mock.calls.length).toBe(2);
    expect(mockErrorHandler.mock.calls[0][0].message).toBe("FOO!");
    expect(mockErrorHandler.mock.calls[1][0]).toBeInstanceOf(
      FunctionNotFoundError,
    );
    done();
  });

  chatbot.initialize();
});
