import { Link } from "./types";

export class ChatbotError extends Error {
  location: Link;
  constructor(location: Link) {
    super(`Chatbot error at '${location.toLinkString()}]'`);

    this.location = location;
    this.name = "ChatbotError";
  }
}

export class InputAbortionException extends ChatbotError {
  constructor(location: Link) {
    super(location);
    this.name = "InputAbortionException";
    this.message = "Input aborted. This should only occur while debugging.";
  }
}
