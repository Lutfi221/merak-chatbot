import fetch from "node-fetch";
import Handle from "../Handle";
import handleRequest from "./handle-request";

jest.mock("node-fetch");

/**
 * Get mocked fetch with the correct typescript typing.
 */
const mf = () => fetch as jest.MockedFunction<typeof fetch>;
const nothing = () => {};

const setFetchResponseTextMock = (text: string) => {
  mf().mockClear();
  // @ts-ignore
  mf().mockResolvedValue({
    text: () => Promise.resolve(text),
  });
};

it("should send a GET request and parse the response", async () => {
  const user = () => ({ name: "Lutfi", id: 420 });
  setFetchResponseTextMock(JSON.stringify(user()));

  const url = "https://socials.com/user?id=123";
  const handle = new Handle({
    step: {
      request: {
        var: "user",
        method: "GET",
        url: url,
      },
    },
  });

  await handleRequest(handle, nothing);

  expect(mf().mock.calls).toHaveLength(1);
  expect(mf().mock.calls[0][0]).toBe(url);
  expect(handle.storage.dictionary.user).toEqual(user());
});

it("should send a POST request and parse the response", async () => {
  const url = "https://devlutfi.com/blog";
  const resObj = { success: true };
  const body = () => ({ title: "Abc" });
  setFetchResponseTextMock(JSON.stringify(resObj));

  const handle = new Handle({
    step: {
      request: {
        var: "postResponse",
        method: "POST",
        url: url,
        body: body(),
      },
    },
  });

  await handleRequest(handle, nothing);

  expect(handle.storage.dictionary.postResponse).toEqual(resObj);
  expect(mf().mock.calls[0][1]?.body).toBe(JSON.stringify(body()));
});

it("should expand placeholder variables", async () => {
  const urlTemplate = () => "https://dev{{user}}.com/blog/{{title}}";
  const bodyTemplate = () => ({ title: "{{title}}", user: "{{user}}" });
  setFetchResponseTextMock("{}");

  const handle = new Handle({
    step: {
      request: {
        var: "postResponse",
        method: "POST",
        url: urlTemplate(),
        body: bodyTemplate(),
      },
    },
  });
  handle.storage.dictionary = { user: "lutfi", title: "Abc" };

  await handleRequest(handle, nothing);

  expect(mf().mock.calls).toHaveLength(1);
  expect(mf().mock.calls[0][0]).toBe(
    handle.storage.expandString(urlTemplate()),
  );
  expect(mf().mock.calls[0][1]?.body).toBe(
    JSON.stringify(handle.storage.expandObject(bodyTemplate())),
  );
});
