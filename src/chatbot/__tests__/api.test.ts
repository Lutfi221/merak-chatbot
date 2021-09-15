import Chatbot from "../Chatbot";
import { Data } from "../index";
import fetch from "node-fetch";

jest.mock("node-fetch");
const fetchMock = fetch as unknown as jest.Mock<typeof fetch>;
fetchMock.mockResolvedValue({
  // @ts-ignore
  json: () =>
    new Promise((res) => {
      res({ name: "Paijo", age: 14, country: "Canada" });
    }),
});

it("should send GET request", (done) => {
  const data: Data = {
    pages: {
      "/start": [
        {
          name: "_",
          userInput: true,
        },
        {
          name: "name",
          value: "Paijo",
        },
        {
          name: "height",
          value: 194,
        },
        {
          name: "user",
          api: "http://127.0.0.1/user?name={{name}}&height={{height}}",
          content: "{{user.name}} {{user.age}} {{user.country}}",
        },
      ],
    },
  };

  const chatbot = new Chatbot(data);
  chatbot.once("output", (msg) => {
    expect(msg).toBe("Paijo 14 Canada");
    expect(chatbot.storage.user).toMatchObject({
      name: "Paijo",
      age: 14,
      country: "Canada",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "http://127.0.0.1/user?name=Paijo&height=194",
    );
    done();
  });
  chatbot.initialize();
  chatbot.input("a");
});

it("should send GET request using api.body and URL encode it", (done) => {
  const data: Data = {
    pages: {
      "/start": [
        {
          name: "_",
          userInput: true,
        },
        {
          name: "name",
          value: "Paijo@gmail.com",
        },
        {
          name: "height",
          value: 194,
        },
        {
          name: "user",
          api: {
            url: "http://127.0.0.1/user",
            body: {
              name: "{{name}}",
              height: "{{height}}",
            },
          },
          content: "{{user.name}} {{user.age}} {{user.country}}",
        },
      ],
    },
  };

  const chatbot = new Chatbot(data);
  chatbot.once("output", (msg) => {
    expect(msg).toBe("Paijo 14 Canada");
    expect(chatbot.storage.user).toMatchObject({
      name: "Paijo",
      age: 14,
      country: "Canada",
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      "http://127.0.0.1/user?name=Paijo%40gmail.com&height=194",
    );
    done();
  });
  chatbot.initialize();
  chatbot.input("a");
});

it("should send POST request", (done) => {
  const data: Data = {
    pages: {
      "/start": [
        {
          name: "_",
          userInput: true,
        },
        {
          name: "name",
          value: "Paijo",
        },
        {
          name: "height",
          value: 194,
        },
        {
          name: "user",
          api: {
            method: "POST",
            url: "http://127.0.0.1/user",
            body: {
              name: "{{name}}",
              height: "{{height}}",
            },
          },
          content: "{{user.name}} {{user.age}} {{user.country}}",
        },
      ],
    },
  };

  const chatbot = new Chatbot(data);
  chatbot.once("output", (msg) => {
    expect(msg).toBe("Paijo 14 Canada");
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1/user");
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Paijo",
        height: "194",
      }),
    });
    done();
  });
  chatbot.initialize();
  chatbot.input("a");
});

it("should handle failed requests", async () => {
  fetchMock.mockReset();
  // @ts-ignore
  fetchMock.mockRejectedValue(new Error("api error"));

  const data: Data = {
    pages: {
      "/start": {
        content: "start",
        links: {
          "/simple-get": "/simple-get",
          "/get": "/get",
          "/post": "/post",
        },
      },
      "/simple-get": [
        { content: "simple-get" },
        {
          content: "this text should not be outputted",
          name: "api",
          api: "http://127.0.0.1/fail",
          apiFailLink: "/failed",
        },
      ],
      "/get": [
        { content: "get" },
        {
          content: "this text should not be outputted",
          name: "api",
          api: {
            url: "http://127.0.0.1/fail",
          },
          apiFailLink: "/failed",
        },
      ],
      "/post": [
        { content: "post" },
        {
          content: "this text should not be outputted",
          name: "api",
          api: {
            method: "POST",
            url: "http://127.0.0.1/fail",
          },
          apiFailLink: "/failed",
        },
      ],
      "/failed": {
        content: "fail",
      },
    },
  };
  const chatbot = new Chatbot(data, { outputRecordingEnabled: true });
  const errors: Error[] = [];
  chatbot.on("error", (error) => {
    errors.push(error);
  });
  chatbot.initialize();

  await chatbot.input("/simple-get");
  await chatbot.input("/get");
  await chatbot.input("/post");

  expect(chatbot.outputs).toEqual([
    "start",
    "simple-get",
    "fail",

    "start",
    "get",
    "fail",

    "start",
    "post",
    "fail",

    "start",
  ]);

  expect(errors.length).toBe(3);
});
