import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { Data, Link, Step } from "./index";

export type Head = {
  /**
   * Current page
   */
  page: Link;
  /**
   * Current step index
   */
  index: number;
  /**
   * The amount of steps in a step
   */
  stepsAmount: number;
};

export const enum Status {
  Busy = "BUSY",
  WaitingInput = "WAITING_INPUT",
  Uninitialized = "UNINITIALIZED",
}

export type Storage = { [name: string]: any };

export interface Events {
  output: (message: string) => void;
  "status-change": (status: Status) => void;
  /**
   * When the last step in a page has been
   * completed.
   */
  "steps-complete": (storage: Storage) => void;
}

export default class Chatbot extends (EventEmitter as new () => TypedEmitter<Events>) {
  head: Head = {
    page: "/start",
    index: 0,
    stepsAmount: 1,
  };
  data: Data;
  /**
   * Stores form values.
   */
  storage: Storage = {};
  status = Status.Uninitialized;
  private running;
  constructor(data: Data) {
    super();
    this.data = data;
    this.running = false;
  }

  /**
   * Gets the text content from the current
   * step.
   */
  getPrompt(): string | undefined {
    return this.getCurrentStep().content;
  }

  /**
   * Initializes the chatbot.
   */
  initialize() {
    if (this.status === Status.Uninitialized) this.run();
  }

  /**
   * Inputs user submitted text.
   *
   * @param      input  User input
   *
   * @return     a promise of the next step's text content.
   */
  async input(input?: string) {
    if (this.status !== Status.WaitingInput) return;
    if (!input) return;

    this.setStatus(Status.Busy);

    const step = this.getCurrentStep();
    let inputMatchedWithValues = false;

    if (step.links) {
      /**
       * Search for matches in "links".
       */
      for (let key in step.links) {
        if (input === key) {
          this.navigate(step.links[key]);
          this.run();
          return;
        }
      }
    }

    if (step.values) {
      /**
       * Search for matches in "values".
       */
      for (let key in step.values) {
        if (input === key) {
          if (!step.name)
            throw new Error(
              `name is missing at step ${this.head.page}[${this.head.index}]`,
            );

          this.storage[step.name] = step.values[key];
          inputMatchedWithValues = true;
          break;
        }
      }
    }

    if (step.userInput && !inputMatchedWithValues) {
      let pattern: RegExp;

      if (!step.userInputValidator) {
        pattern = RegExp("");
      } else if (typeof step.userInputValidator === "string") {
        pattern = RegExp(step.userInputValidator);
      } else {
        pattern = step.userInputValidator;
      }

      if (!pattern.test(input)) {
        // TODO: handle unmatched input
        this.setStatus(Status.WaitingInput);
        return;
      }

      if (!step.name)
        throw new Error(
          `name is missing at step ${this.head.page}[${this.head.index}]`,
        );

      this.storage[step.name] = input;
    }

    /**
     * If the user's input doesn't matched anything
     */
    if (!step.userInput && !inputMatchedWithValues) {
      /**
       * Resend the last step's message.
       */
      this.run();
      return;
    }

    this.next();
    this.run();
  }

  getCurrentStep(): Step {
    return this.data.pages[this.head.page][this.head.index];
  }

  /**
   * Execute all steps in a page until it reaches a step that
   * requires the user's input
   */
  private async run() {
    if (this.status === Status.WaitingInput || this.running) return;
    this.running = true;
    this.setStatus(Status.Busy);

    while (true) {
      const step = this.getCurrentStep();
      const needsInput = this.stepNeedsInput(step);

      if (step.api) {
        // TODO: fetch api
      }

      this.emitOutput(step.content);

      if (needsInput) {
        if (typeof step.value !== "undefined") {
          this.storage[step.name!] = step.value;
          this.next();
          continue;
        }
        this.setStatus(Status.WaitingInput);
        this.running = false;
        return;
      }

      this.next();
    }
  }

  /**
   * Update "head" to the page and index
   *
   * @param      step   Step
   * @param      index  Step index
   */
  private navigate(page?: Link, index = 0) {
    if (page) {
      this.head.page = page;
      this.head.stepsAmount = this.data.pages[page].length;
    }
    this.head.index = index;
  }

  /**
   * Update "head" to the next step in a page.
   */
  private next() {
    /**
     * If the head is on the last step.
     */
    if (this.head.stepsAmount === this.head.index + 1) {
      this.emit("steps-complete", this.storage);
      this.navigate("/start");
      return;
    }

    this.navigate(undefined, this.head.index + 1);
  }

  /**
   * Sets status and emit "status-change" event
   * if the status is different.
   */
  private setStatus(status: Status) {
    if (status === this.status) return;
    this.status = status;
    this.emit("status-change", status);
  }

  /**
   * Emit "output" event
   *
   * If no message is provided, will get prompt
   * from the current step. If there is no
   * prompt, it wil not emit an "output" event.
   */
  private emitOutput(message?: string) {
    if (!message) {
      const prompt = this.getPrompt();
      if (!prompt) return;
      message = prompt;
    }
    this.emit("output", message);
  }

  private stepNeedsInput(step: Step): boolean {
    return (
      typeof step.name !== "undefined" ||
      typeof step.links !== "undefined" ||
      step.userInput ||
      typeof step.values !== "undefined"
    );
  }
}
