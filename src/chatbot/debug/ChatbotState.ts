import { applyPatches } from "immer";
import Storage from "../Storage";
import { Link } from "../types";
import ChatbotStatePatch from "./ChatbotStatePatch";
import Io from "./Io";

class ChatbotState {
  ios: Io[];
  storage: Storage;
  link: Link | null;

  constructor(ios: Io[], storage: Storage, link: Link | null) {
    this.ios = ios;
    this.storage = storage;
    this.link = link;
  }

  static fromPatches(patches: ChatbotStatePatch[]): ChatbotState {
    const ios: Io[] = [];
    const storage = new Storage();
    let link: Link | null = null;

    for (const patch of patches) {
      ios.push(...patch.ios);
      storage.dictionary = applyPatches(
        storage.dictionary,
        patch.storagePatches,
      );
      if (patch.link) link = patch.link;
    }

    return new ChatbotState(ios, storage, link);
  }
}

export default ChatbotState;
