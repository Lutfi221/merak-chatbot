import EventEmitter from "events";
import TypedEmitter from "typed-emitter";
import { Data, Link, Page } from "./index";

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
   * The amount of steps in a page
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
   * page.
   */
  getPrompt(): string | undefined {
    return this.getCurrentPage().content;
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
   * @return     a promise of the next page's text content.
   */
  async input(input?: string) {
    if (this.status !== Status.WaitingInput) return;
    if (!input) return;

    this.setStatus(Status.Busy);

    const page = this.getCurrentPage();
    let inputMatchedWithValues = false;

    if (page.links) {
      /**
       * Search for matches in "links".
       */
      for (let key in page.links) {
        if (input === key) {
          this.navigate(page.links[key]);
          this.run();
          return;
        }
      }
    }

    if (page.values) {
      /**
       * Search for matches in "values".
       */
      for (let key in page.values) {
        if (input === key) {
          if (!page.name)
            throw new Error(
              `name is missing at page ${this.head.page}[${this.head.index}]`,
            );

          this.storage[page.name] = page.values[key];
          inputMatchedWithValues = true;
          break;
        }
      }
    }

    if (page.userInput && !inputMatchedWithValues) {
      let pattern: RegExp;

      if (!page.userInputValidator) {
        pattern = RegExp("");
      } else if (typeof page.userInputValidator === "string") {
        pattern = RegExp(page.userInputValidator);
      } else {
        pattern = page.userInputValidator;
      }

      if (!pattern.test(input)) {
        // TODO: handle unmatched input
        this.setStatus(Status.WaitingInput);
        return;
      }

      if (!page.name)
        throw new Error(
          `name is missing at page ${this.head.page}[${this.head.index}]`,
        );

      this.storage[page.name] = input;
    }

    /**
     * If the user's input doesn't matched anything
     */
    if (!page.userInput && !inputMatchedWithValues) {
      /**
       * Resend the last step's message.
       */
      this.run();
      return;
    }

    this.next();
    this.run();
  }

  getCurrentPage(): Page {
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
      const page = this.getCurrentPage();
      const needsInput = this.pageNeedsInput(page);

      if (page.api) {
        // TODO: fetch api
      }

      this.emitOutput(page.content);

      if (needsInput) {
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
   * @param      page   Page
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

  private pageNeedsInput(page: Page): boolean {
    return (
      typeof page.links !== "undefined" ||
      page.userInput ||
      typeof page.values !== "undefined"
    );
  }
}
