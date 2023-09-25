import { Link } from "./types";

export class ChatbotError extends Error {
  location: Link;
  constructor(location: Link) {
    super(`An error occured at '${location.toLinkString()}]'`);

    this.location = location;
    this.name = "ChatbotError";
  }
}
