import { createDraft, enablePatches, finishDraft } from "immer";
import Chatbot from "./Chatbot";
import Storage from "./Storage";
import { FlowData } from "../types";
import { ChatbotFunctionDictionary } from "./types";

/**
 * ChatbotDebugger includes helper methods for debugging chatbots.
 */
class ChatbotDebugger extends Chatbot {
  constructor(data: FlowData, functions: ChatbotFunctionDictionary = {}) {
    enablePatches();
    super(data, functions);
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

    this.storage.dictionary = finishDraft(handle.storage.dictionary);
    await this.applyHandle(handle);
  }
}

export default ChatbotDebugger;
