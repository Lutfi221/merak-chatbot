import { Step } from "../types";
import Storage from "./Storage";
import { ChatbotFunctionDictionary, Link, Message } from "./types";

type GetInput = () => Promise<Message>;
type Print = (msg: Message) => void;

export enum HandleInputStatus {
  None,
  Accepted,
  Rejected,
}

export type HandleOptions = {
  step?: Step | null;
  nextLink?: Link | null;
  storage?: Storage;
  functions?: ChatbotFunctionDictionary;
  promptInput?: GetInput;
  print?: Print;
};

/**
 * Object that is passed and processed through step handlers.
 */
export default class Handle {
  nextLink: Link | null = null;
  step: Step | null;

  readonly functions: ChatbotFunctionDictionary;

  private input: Message | undefined;
  private inputStatus_ = HandleInputStatus.None;
  private inputRejectionMsg_: Message | undefined;
  storage: Storage;

  constructor(options?: HandleOptions) {
    const {
      step = null,
      nextLink = null,
      storage = new Storage(),
      functions = {},
      promptInput,
      print,
    } = options || {};
    this.step = step;
    this.nextLink = nextLink;
    this.storage = storage;
    this.functions = functions;

    if (promptInput) this.promptInput = promptInput;
    if (print) this.print = print;
  }

  print: Print = () => {};

  async getInput() {
    if (this.input !== undefined) return this.input;
    this.input = await this.promptInput();
    return this.input;
  }

  rejectInput(rejectionMsg: Message): void {
    this.inputRejectionMsg_ = rejectionMsg;
    if (this.inputStatus_ !== HandleInputStatus.Accepted)
      this.inputStatus_ = HandleInputStatus.Rejected;
  }
  acceptInput(): void {
    this.inputStatus_ = HandleInputStatus.Accepted;
  }

  get inputRejectionMsg() {
    return this.inputRejectionMsg_;
  }

  get inputStatus() {
    return this.inputStatus_;
  }

  private promptInput: GetInput = () => {
    throw new Error("Handle.promptInput not implemented.");
  };
}

export type StepHandler = (handle: Handle, next: () => void) => Promise<void>;
