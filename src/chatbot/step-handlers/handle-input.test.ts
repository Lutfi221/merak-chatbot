import { handleInput } from ".";
import Handle, { HandleInputStatus } from "../Handle";

it("should process a text input", async () => {
  const createHandle = (input: string) =>
    new Handle(
      { input: { type: "text", var: "user.name" } },
      undefined,
      undefined,
      undefined,
      () => Promise.resolve(input),
    );
  const handle = createHandle("Lutfi");

  await handleInput(handle, () => {});
  expect(handle.inputStatus).toEqual(HandleInputStatus.Accepted);
  expect(handle.storage.getValue("user.name")).toEqual("Lutfi");
});

it("should validate text input with pattern", async () => {
  const createHandle = (input: string) =>
    new Handle(
      { input: { type: "text", var: "user.height", pattern: "^\\d+$" } },
      undefined,
      undefined,
      undefined,
      () => Promise.resolve(input),
    );

  let handle = createHandle("one seventy");
  await handleInput(handle, () => {});
  expect(handle.inputStatus).toEqual(HandleInputStatus.Rejected);

  handle = createHandle("170");
  await handleInput(handle, () => {});
  expect(handle.inputStatus).toEqual(HandleInputStatus.Accepted);
  expect(handle.storage.getValue("user.height")).toEqual("170");
});
