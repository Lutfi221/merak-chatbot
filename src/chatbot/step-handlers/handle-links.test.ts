import { handleLinks } from ".";
import Handle from "../Handle";
import Storage from "../Storage";

it("should navigate to the selected link", async () => {
  const handle = new Handle({ promptInput: () => Promise.resolve("1") });
  handle.step = {
    links: {
      "1": "/home",
      "2": "/about",
    },
  };

  await handleLinks(handle, () => {});
  expect(handle.nextLink?.toLinkString()).toBe("/home[0]");
});

it("should reject invalid link choices", async () => {
  const handle = new Handle({ promptInput: () => Promise.resolve("3") });

  handle.step = {
    links: {
      "1": "/home",
      "2": "/about",
    },
  };

  await handleLinks(handle, () => {});
  expect(handle.inputRejectionMsg).not.toBeUndefined();
});

it("should expand variables in links", async () => {
  const handle = new Handle({
    storage: new Storage({ var: "value" }),
    promptInput: () => Promise.resolve("B"),
  });

  handle.step = {
    links: {
      A: "/home",
      B: "/about/{{var}}",
    },
  };

  await handleLinks(handle, () => {});
  expect(handle.nextLink?.toLinkString()).toBe("/about/value[0]");
});
