import { FlowData } from "../../types";
import ChatbotDebugger from "./ChatbotDebugger";
import ChatbotState from "./ChatbotState";
import ChatbotStatePatch from "./ChatbotStatePatch";

const shoppingMsgs = [
  "Hello",
  "What do you want to buy?",
  "How much do you want to buy?",
  "Order submitted. Type anything to buy again.",
];

const shoppingFlow: FlowData = {
  pages: {
    "/start": [
      {
        msg: shoppingMsgs[0],
      },
      {
        msg: shoppingMsgs[1],
        input: {
          var: "order.item",
          type: "text",
        },
      },
      {
        msg: shoppingMsgs[2],
        input: {
          var: "order.amount",
          type: "text",
          pattern: "^\\d+$",
        },
      },
      {
        msg: shoppingMsgs[3],
        input: {
          type: "text",
          var: "_",
        },
        next: "/start[1]",
      },
    ],
  },
};

it("should generate state patches", async () => {
  const cd = new ChatbotDebugger(shoppingFlow);
  const patches: ChatbotStatePatch[] = [];

  cd.on("step-complete", (_, patch) => {
    patches.push(patch!);
  });

  await cd.start();
  await cd.inputAsync("Shoes");
  await cd.inputAsync("12");

  expect(patches).toHaveLength(3);

  const state = cd.generateState();
  const stateFromPatches = ChatbotState.fromPatches(patches);

  expect(state.ios).toEqual(stateFromPatches.ios);
  expect(state.link).toEqual(stateFromPatches.link);
  expect(state.storage.dictionary).toEqual(stateFromPatches.storage.dictionary);
});
