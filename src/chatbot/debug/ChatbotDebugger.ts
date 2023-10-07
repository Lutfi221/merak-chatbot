import { Patch, createDraft, enablePatches, finishDraft } from "immer";
import Chatbot from "../Chatbot";
import Storage from "../Storage";
import { FlowData } from "../../types";
import { ChatbotFunctionDictionary, Message } from "../types";
import ChatbotStatePatch from "./ChatbotStatePatch";
import Io from "./Io";
import ChatbotState from "./ChatbotState";

/**
 * ChatbotDebugger includes helper methods for debugging chatbots.
 */
class ChatbotDebugger extends Chatbot {
  private ios: Io[] = [];
  private iosIndexCutoff = 0;

  constructor(data: FlowData, functions: ChatbotFunctionDictionary = {}) {
    enablePatches();
    super(data, functions);

    const handleInput = (msg: Message) => {
      this.ios.push({ type: "input", msg });
    };
    const handleOutput = (msg: Message) => {
      this.ios.push({ type: "output", msg });
    };
    this.on("input", handleInput);
    this.on("output", handleOutput);
  }

  protected async step() {
    const handle = this.createHandle(
      this.head,
      // @ts-expect-error
      new Storage(createDraft(this.storage.dictionary)),
    );

    for (let i = 0; i < this.stepHandlers.length; i++) {
      let shouldContinue = false;
      await this.stepHandlers[i](handle, () => (shouldContinue = true));
      if (!shouldContinue) break;
    }

    const patches = await new Promise<Patch[]>((res) => {
      this.storage.dictionary = finishDraft(
        handle.storage.dictionary,
        (patches) => {
          res(patches);
        },
      );
    });

    await this.applyHandle(handle);

    const statePatch = new ChatbotStatePatch();
    statePatch.link = handle.nextLink;
    statePatch.storagePatches = patches;
    statePatch.ios = this.ios.slice(this.iosIndexCutoff);

    this.iosIndexCutoff = this.ios.length;
    this.emit("step-complete", handle.step!, statePatch);
  }

  /**
   * Generates a ChatbotState from the chatbot state.
   * @returns The chatbot state that should **not** be mutated.
   */
  generateState(): ChatbotState {
    return {
      ios: this.ios.slice(0, this.iosIndexCutoff),
      link: this.head.link,
      storage: new Storage(this.storage.dictionary),
    };
  }
}

export default ChatbotDebugger;
