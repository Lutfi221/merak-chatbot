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
