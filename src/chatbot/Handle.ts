import { Step } from "../types";
import { Head } from "./Head";
import Storage from "./Storage";
import { Link, Message } from "./types";

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
  nextLink: Link | null;
  step: Step | null;
  storage: Storage;

  private input: Message | undefined;
  private promptInput: GetInput;
  private inputStatus_ = HandleInputStatus.None;
  private inputRejectionMsg_: Message | undefined;

  constructor(
    head: Head,
    storage: Storage,
    promptInput: GetInput,
    print: Print,
  ) {
    this.nextLink = head.nextLink;
    this.step = head.step;
    this.storage = storage;

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
