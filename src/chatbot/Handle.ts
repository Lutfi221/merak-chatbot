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

/**
 * Object that is passed and processed through step handlers.
 */
export default class Handle {
  nextLink: Link | null = null;
  step: Step | null;
  storage: Storage;

  readonly functions: ChatbotFunctionDictionary;

  private input: Message | undefined;
  private promptInput: GetInput;
  private inputStatus_ = HandleInputStatus.None;
  private inputRejectionMsg_: Message | undefined;

  constructor(
    step: Step | null,
    nextLink: Link | null,
    storage: Storage,
    functions: ChatbotFunctionDictionary,
    promptInput: GetInput,
    print: Print,
  ) {
    this.step = step;
    this.nextLink = nextLink;
    this.storage = storage;
    this.functions = functions;

    this.promptInput = promptInput;
    this.print = print;
  }

  print: Print;
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
}

export type StepHandler = (handle: Handle, next: () => void) => Promise<void>;
