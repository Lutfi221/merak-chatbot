import EventEmitter from "events";
import TypedEmitter from "../../types/typed-emitter";
import { FlowData } from "../types";
import { Events, Link, Message, Status } from "./types";
import { Head } from "./Head";
import Handle, { HandleInputStatus, StepHandler } from "./Handle";
import {
  handleInput,
  handleLinks,
  handleMessage,
  handleNext,
} from "./step-handlers.ts";
import Storage from "./Storage";

interface IChatbot extends TypedEmitter<Events> {
  initialize: () => Promise<void>;
  status: Status;
  latestMessage: Message;
  input: (msg: Message) => void;
  inputAsync: (msg: Message) => Promise<void>;
}

class Chatbot
  extends (EventEmitter as new () => TypedEmitter<Events>)
  implements IChatbot
{
  storage: Storage;

  private status_ = Status.Uninitialized;
  private latestMessage_: Message = "";
  private data: FlowData;

  private head: Head;
  private stepHandlers: StepHandler[];

  constructor(data: FlowData) {
    super();
    this.data = data;
    this.storage = new Storage();
    this.head = new Head(this.data);
    this.stepHandlers = [handleMessage, handleNext, handleInput, handleLinks];
  }

  initialize(): Promise<void> {
    if (this.status_ != Status.Uninitialized)
      throw new Error("Cannot initialize chatbot that is already initialized.");

    return new Promise((res) => {
      this.once("status-change-waiting-input", res);
      this.run();
    });
  }

  get status() {
    return this.status_;
  }
  get latestMessage() {
    return this.latestMessage_;
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

  private async run() {
    if (this.status_ != Status.Uninitialized) return;
    this.status_ = Status.Busy;

    while (true) {
      const handle = new Handle(
        this.head,
        this.storage,
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

      for (let i = 0; i < this.stepHandlers.length; i++) {
        let shouldContinue = false;
        await this.stepHandlers[i](handle, () => (shouldContinue = true));
        if (!shouldContinue) break;
      }

      if (handle.inputStatus === HandleInputStatus.Rejected)
        this.emit("output", handle.inputRejectionMsg || "Invalid input.");
      else this.head.navigate(handle.nextLink || Link.fromLinkString("/start"));
    }
  }

  private set status(status: Status) {
    this.status_ = status;
    if (status === Status.WaitingInput)
      this.emit("status-change-waiting-input");
    this.emit("status-change", status);
  }
}

export default Chatbot;
