import { Step } from "../types";
import { Head } from "./Head";
import { Link, Message } from "./types";

type GetInput = () => Promise<Message>;
type Print = (msg: Message) => void;

enum HandleInputStatus {
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

  private input: Message | undefined;
  private promptInput: GetInput;
  private inputStatus = HandleInputStatus.None;
  private inputRejectionMsg_: Message | undefined;

  constructor(head: Head, promptInput: GetInput, print: Print) {
    this.nextLink = head.nextLink;
    this.step = head.step;
    this.promptInput = promptInput;
    this.print = print;
  }

  print: Print;
  async getInput() {
    if (this.input !== undefined) return this.input;
    this.input = await this.promptInput();
    return this.input;
  }

  rejectInput(rejectionMsg: string): void {
    this.inputRejectionMsg_ = rejectionMsg;
    if (this.inputStatus !== HandleInputStatus.Accepted)
      this.inputStatus = HandleInputStatus.Rejected;
  }
  acceptInput(): void {
    this.inputStatus = HandleInputStatus.Accepted;
  }

  get inputRejectionMsg() {
    return this.inputRejectionMsg_;
  }
}

export type StepHandler = (handle: Handle, next: () => void) => Promise<void>;
