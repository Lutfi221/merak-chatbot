
export class MissingPropertyError extends Error {
  page: string;
  index: number;
  constructor(property: string, page?: string | null, index?: number) {
    let message = `Missing property: '${property}'`;
    if (page) message += ` at ${page}`;
    if (index) message += `[${index}]`;

    super(message);
    this.name = "MissingPropertyError";
    this.page = page || "";
    this.index = index || 0;
  }
}
