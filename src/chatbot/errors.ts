import { Link } from "./types";

export class ChatbotError extends Error {
  location: Link;
  origin?: Error;

  constructor(location: Link, message?: string) {
    super(`Chatbot error at '${location.toLinkString()}'\n` + message);

    this.location = location;
    this.name = "ChatbotError";
  }

  static fromError(location: Link, error: Error): ChatbotError {
    const chatbotError = new ChatbotError(location, error.message);
    chatbotError.origin = error;
    return chatbotError;
  }
}

export class InputAbortionException extends ChatbotError {
  constructor(location: Link) {
    super(location, "Input aborted. This should only occur while debugging.");
    this.name = "InputAbortionException";
  }
}
