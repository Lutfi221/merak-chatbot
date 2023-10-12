import { handleMessage } from ".";
import Handle from "../Handle";

it("should print the message", async () => {
  const print = jest.fn();
  const next = jest.fn();
  const handle = new Handle({ step: { msg: "Hello, world!" }, print });

  await handleMessage(handle, next);
  expect(print).toHaveBeenCalledWith("Hello, world!");
  expect(next).toHaveBeenCalled();
});

it("should print the message array", async () => {
  const print = jest.fn();
  const next = jest.fn();
  const handle = new Handle({
    step: { msg: ["Hello, ", "world!"] },
    print,
  });

  await handleMessage(handle, next);
  expect(print).toHaveBeenCalledWith("Hello, world!");
  expect(next).toHaveBeenCalled();
});
