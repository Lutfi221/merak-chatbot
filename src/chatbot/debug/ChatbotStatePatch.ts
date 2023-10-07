import { Patch } from "immer";
import Io from "./Io";
import { Link } from "../types";

/**
 * Representation of the changes made to the chatbot state.
 */
class ChatbotStatePatch {
  ios: Io[] = [];
  storagePatches: Patch[] = [];
  link: Link | null = null;
}

export default ChatbotStatePatch;
