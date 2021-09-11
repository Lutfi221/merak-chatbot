import Chatbot from "../Chatbot";
import { Data } from "../index";
import fetch from "node-fetch";

jest.mock("node-fetch");
const fetchMock = fetch as unknown as jest.Mock<typeof fetch>;

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
  fetchMock.mockResolvedValue({
    // @ts-ignore
    json: () =>
      new Promise((res) => {
        res({ name: "Paijo", age: 14, country: "Canada" });
      }),
  });

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
