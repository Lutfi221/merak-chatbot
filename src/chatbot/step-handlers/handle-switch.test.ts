import handleSwitch from "./handle-switch";
import Handle from "../Handle";
import Storage from "../Storage";

it("should not change step if step has no switch", async () => {
  const createStep = () => ({ msg: "Hello" });
  const step = createStep();
  const handle = new Handle({ step });
  const next = jest.fn();

  await handleSwitch(handle, next);

  expect(next).toHaveBeenCalled();
  expect(step).toEqual(createStep());
});

it("should switch to the correct case without mutating the original step object", async () => {
  const createStep = () => ({
    switch: {
      var: "var",
      cases: {
        "1": { msg: "1" },
        "2": { msg: "2" },
      },
    },
  });
  const step = createStep();
  const handle = new Handle({ step, storage: new Storage({ var: 1 }) });
  const next = jest.fn();

  await handleSwitch(handle, next);

  expect(next).toHaveBeenCalled();
  expect(handle.step).toEqual({ msg: "1" });
  expect(step).toEqual(createStep());
});

it("should switch to the default case if the value is not in the cases", async () => {
  const step = {
    switch: {
      var: "var",
      cases: {
        "1": { msg: "1" },
        "2": { msg: "2" },
      },
      default: { msg: "default" },
    },
  };
  const handle = new Handle({ step, storage: new Storage({ var: 3 }) });
  const next = jest.fn();

  await handleSwitch(handle, next);

  expect(next).toHaveBeenCalled();
  expect(handle.step).toEqual({ msg: "default" });
});

it("should merge the case step with the original step and remove the `switch` property", async () => {
  const createStep = () => ({
    next: "/end",
    switch: {
      var: "var",
      cases: {
        true: { msg: "1" },
        false: { msg: "2" },
      },
    },
  });
  const step = createStep();
  const handle = new Handle({ step, storage: new Storage({ var: true }) });
  const next = jest.fn();

  await handleSwitch(handle, next);

  expect(next).toHaveBeenCalled();
  expect(handle.step).toEqual({ msg: "1", next: "/end" });
  expect(step).toEqual(createStep());
});
