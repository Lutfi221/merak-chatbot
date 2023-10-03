import { FlowData } from "../types";
import { ChatbotFunctionDictionary, Link, Message, Status } from "./types";
import Head from "./Head";
import Handle, { HandleInputStatus, StepHandler } from "./Handle";
import { DEFAULT_STEP_HANDLERS } from "./step-handlers";
import Storage from "./Storage";
import ChatbotEventEmitter from "./ChatbotEventEmitter";

export interface ChatbotBase extends ChatbotEventEmitter {
  storage: Storage;
  readonly status: Status;
  readonly latestMessage: Message;
  readonly functions: ChatbotFunctionDictionary;

  initialize: () => Promise<void>;
  input: (msg: Message) => void;
  inputAsync: (msg: Message) => Promise<void>;
}

/**
 * Main chatbot class.
 */
class Chatbot extends ChatbotEventEmitter implements ChatbotBase {
  storage: Storage;
  readonly functions: ChatbotFunctionDictionary;

  private status_ = Status.Uninitialized;
  private latestMessage_: Message = "";
  private data: FlowData;

  protected head: Head;
  protected stepHandlers: StepHandler[];

  constructor(data: FlowData, functions: ChatbotFunctionDictionary = {}) {
    super();
    this.data = data;
    this.storage = new Storage();
    this.head = new Head(this.data);
    this.stepHandlers = [...DEFAULT_STEP_HANDLERS];
    this.functions = functions;
  }

  initialize(): Promise<void> {
    if (this.status_ != Status.Uninitialized)
      throw new Error("Cannot initialize chatbot that is already initialized.");

    return new Promise((res) => {
      this.once("status-change-waiting-input", res);
      this.run();
    });
  }

  input(msg: Message) {
    if (this.status_ != Status.WaitingInput) {
      console.warn(
        `Attempting to input while Chatbot is not waiting for input.\n` +
          `This should be avoided as the input will be ignored.`,
      );
    }
    this.emit("input", msg);
  }

  inputAsync(msg: Message): Promise<void> {
    if (this.status_ != Status.WaitingInput) {
      throw new Error(
        "Chatbot.inputAsync() can only be called when the " +
          "chatbot's status is waiting for input.",
      );
    }

    return new Promise<void>((res) => {
      this.once("status-change-waiting-input", res);
      this.emit("input", msg);
    });
  }

  get status() {
    return this.status_;
  }
  get latestMessage() {
    return this.latestMessage_;
  }

  private async run() {
    if (this.status_ != Status.Uninitialized) return;
    this.status_ = Status.Busy;

    while (true) {
      await this.step();
    }
  }

  protected async step() {
    const handle = this.createHandle();

    for (let i = 0; i < this.stepHandlers.length; i++) {
      let shouldContinue = false;
      await this.stepHandlers[i](handle, () => (shouldContinue = true));
      if (!shouldContinue) break;
    }

    await this.applyHandle(handle);
  }

  /**
   * Create a `Handle` object.
   */
  protected createHandle(head = this.head, storage = this.storage) {
    return new Handle(
      head.step,
      head.nextLink,
      storage,
      this.functions,
      () =>
        new Promise((res) => {
          this.once("input", (msg) => {
            this.status = Status.Busy;
            res(msg);
          });
          this.status = Status.WaitingInput;
        }),
      (msg) => this.emit("output", msg),
    );
  }

  /**
   * Applies the handle to the chatbot, updating the chatbot's state.
   */
  protected async applyHandle(handle: Handle) {
    if (handle.inputStatus === HandleInputStatus.Rejected)
      this.emit("output", handle.inputRejectionMsg || "Invalid input.");
    else this.head.navigate(handle.nextLink || Link.fromLinkString("/start"));
  }

  private set status(status: Status) {
    this.status_ = status;
    if (status === Status.WaitingInput)
      this.emit("status-change-waiting-input");
    this.emit("status-change", status);
  }
}

export default Chatbot;
