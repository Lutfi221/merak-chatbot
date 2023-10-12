import { handleMessage } from ".";
import Handle from "../Handle";
import Storage from "../Storage";

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

it("should print the message with variables", async () => {
  const print = jest.fn();
  const next = jest.fn();
  const handle = new Handle({
    step: { msg: "Hello {{name}}!" },
    print,
    storage: new Storage({ name: "Lutfi" }),
  });

  await handleMessage(handle, next);
  expect(print).toHaveBeenCalledWith("Hello Lutfi!");
  expect(next).toHaveBeenCalled();

  handle.step!.msg = ["How are you ", "{{name}}?"];
  await handleMessage(handle, next);
  expect(print).toHaveBeenCalledWith("How are you Lutfi?");
});
