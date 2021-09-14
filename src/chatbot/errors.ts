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
