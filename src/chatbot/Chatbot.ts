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

  start: () => Promise<void>;
  input: (msg: Message) => void;
  inputAsync: (msg: Message) => Promise<void>;
}

/**
 * Main chatbot class.
 */
class Chatbot extends ChatbotEventEmitter implements ChatbotBase {
  storage: Storage;
  readonly functions: ChatbotFunctionDictionary;

  private status_ = Status.Paused;
  private shouldStop = false;
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

  /**
   * Start the chatbot from a paused state.
   *
   * @returns A promise that resolves when
   *          the chatbot is paused or is waiting input.
   */
  start(): Promise<void> {
    if (this.status === Status.Busy)
      throw new Error("Cannot start chatbot that is already running.");
    if (this.status === Status.WaitingInput)
      throw new Error("Cannot start chatbot that is waiting for input.");

    return new Promise((res) => {
      this.onUntilFalse("status-change", (status) => {
        if (status !== Status.Busy) {
          res();
          return false;
        }
        return true;
      });

      this.run();
    });
  }

  /**
   * Sends a pause signal to the chatbot.
   * It will pause after the current step is completed.
   * This method is typically used during testing.
   *
   * If the chatbot's status is waiting for input,
   * it will not pause immediately. Instead, it will pause
   * after the chatbot received an input,
   * and the current step is completed.
   *
   * @returns A promise that resolves when the chatbot is paused.
   */
  pause(): Promise<void> {
    this.shouldStop = true;
    return new Promise((res) => {
      this.onUntilFalse("status-change", (status) => {
        if (status === Status.Paused) {
          res();
          return false;
        }
        return true;
      });
    });
  }

  input(msg: Message) {
    if (this.status != Status.WaitingInput) {
      console.warn(
        `Attempting to input while Chatbot is not waiting for input.\n` +
          `This should be avoided as the input will be ignored.`,
      );
    }
    this.emit("input", msg);
  }

  inputAsync(msg: Message): Promise<void> {
    if (this.status != Status.WaitingInput) {
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
    if (this.status != Status.Paused) return;
    this.status = Status.Busy;

    while (!this.shouldStop) {
      await this.step();
    }

    this.status = Status.Paused;
    // Reset stop flag.
    this.shouldStop = false;
  }

  protected async step() {
    const handle = this.createHandle();

    for (let i = 0; i < this.stepHandlers.length; i++) {
      let shouldContinue = false;
      await this.stepHandlers[i](handle, () => (shouldContinue = true));
      if (!shouldContinue) break;
    }

    this.emit("step-complete", this.head.step!);

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
