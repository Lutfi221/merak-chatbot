import { Status } from "./types";

export class ChatbotError extends Error {
  page: string;
  index: number;
  constructor(page: string | null, index: number) {
    if (!page) page = "null";
    super(`An error occured at '${page}[${index}]'`);

    this.name = "ChatbotError";
    this.page = page;
    this.index = index;
  }
}

export class MissingPropertyError extends ChatbotError {
  constructor(property: string, page: string | null, index: number) {
    super(page, index);
    this.name = "MissingPropertyError";
    this.message = `Missing property '${property}' at ${page}[${index}]`;
  }
}

export class FreefallError extends ChatbotError {
  freefallAmount: number;
  constructor(freefallAmount: number, page: string | null, index: number) {
    super(page, index);
    this.name = "FreefallError";
    this.message =
      `A potential infinite loop at ${page}[${index}]\n` +
      `If this is intentional, increase 'options.freefallLimit'.`;
    this.freefallAmount = freefallAmount;
  }
}

export class FunctionNotFoundError extends ChatbotError {
  constructor(fnName: string, page: string | null, index: number) {
    super(page, index);
    this.name = "FunctionNotFoundError";
    this.message = `The function '${fnName}' does not exist at ${page}[${index}]`;
  }
}

export class InvalidSimulatedInputError extends ChatbotError {
  input: string;
  constructor(input: string, page: string | null, index: number) {
    super(page, index);
    this.name = "InvalidSimulatedInputError";
    this.input = input;
    this.message =
      `The simulated input '${input}' at ${page}[${index}] is invalid because ` +
      `it doesn't match with any 'values', 'links', or 'userInput'.\n` +
      `Add a 'defaultValue' or 'defaultLink' property to handle invalid inputs.`;
  }
}

export class StatusError extends Error {
  status: Status;
  constructor(message: string, status: Status) {
    super(message);
    this.status = status;
  }
}
