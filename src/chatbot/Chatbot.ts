import EventEmitter from "events";
import TypedEmitter from "../../types/typed-emitter";
import { Data, Link, Step, Value } from "./index";
import fetch from "node-fetch";
import * as errors from "./errors";

export type Head = {
  /**
   * Current page
   */
  page: Link | null;
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
  error: (error: Error) => void;
}

export type Options = {
  /**
   * If enabled, every user input will be pushed to
   * 'inputs' property.
   */
  inputRecordingEnabled?: boolean;
  /**
   * If enabled, every chatbot output will be pushed to
   * 'outputs' property.
   */
  outputRecordingEnabled?: boolean;
  /**
   * The limit of steps without a required input.
   * To help detect freefalling unstoppable infinite loops.
   */
  freefallLimit?: number;
};

export const DEFAULT_OPTIONS: Required<Options> = {
  inputRecordingEnabled: false,
  outputRecordingEnabled: false,
  freefallLimit: 20,
};

export default class Chatbot extends (EventEmitter as new () => TypedEmitter<Events>) {
  head: Head = {
    page: null,
    index: 0,
    stepsAmount: 0,
  };
  data: Data;
  /**
   * Stores form values.
   */
  storage: Storage = {};
  status = Status.Uninitialized;
  readonly options: Required<Options>;

  inputs: string[] = [];
  outputs: string[] = [];
  private stepsSinceLastInput = 0;
  private hasTriggers = true;
  private running;
  constructor(data: Data, options: Options = {}) {
    super();
    if (!data.triggers) {
      this.hasTriggers = false;
      this.head.page = "/start";
      if (Array.isArray(data.pages["/start"])) {
        this.head.stepsAmount = (data.pages["/start"] as Step[]).length;
      }
    }

    this.data = data;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.running = false;

    if (this.options.outputRecordingEnabled) {
      this.on("output", (msg) => {
        this.outputs.push(msg);
      });
    }
  }

  /**
   * Gets the text content from the current
   * step.
   */
  getPrompt(): string {
    return this.getCurrentStep().content || "";
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
  async input(input = "") {
    if (this.options.inputRecordingEnabled) {
      this.inputs.push(input);
    }

    if (this.status !== Status.WaitingInput) return;
    if (!input) return;

    this.setStatus(Status.Busy);

    if (this.head.page === null) {
      if (!this.hasTriggers) {
        this.navigate("/start");
        this.run();
        return;
      }

      const caseSensitive = this.data.settings?.caseSensitiveTrigger;
      let compare: (a: string, b: string) => boolean;

      if (caseSensitive) {
        compare = (a, b) => a === b;
      } else {
        compare = (a, b) => a.toLowerCase() === b.toLowerCase();
      }

      for (let trigger in this.data.triggers!) {
        if (compare(trigger, input)) {
          this.navigate(this.data.triggers[trigger]);
          this.run();
          return;
        }
      }
      this.setStatus(Status.WaitingInput);
    }

    const step = this.getCurrentStep();
    let inputMatchedWithValues = false;
    let link: Link = "";

    if (step.links) {
      /**
       * Search for matches in "links".
       */
      for (let key in step.links) {
        if (input === key) {
          link = step.links[key];
        }
      }
    }

    if (step.values) {
      /**
       * Search for matches in "values".
       */
      for (let key in step.values) {
        if (input === key) {
          if (!step.name) {
            this.emit(
              "error",
              new errors.MissingPropertyError(
                "name",
                this.head.page,
                this.head.index,
              ),
            );
            break;
          }

          this.storage[step.name] = step.values[key];
          inputMatchedWithValues = true;
          break;
        }
      }
    }

    /**
     * To allow "values" and "links" to overlap.
     */
    if (link) {
      this.navigate(link);
      this.run();
      return;
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
        this.emitOutput(step.invalidInputMessage);
        this.setStatus(Status.WaitingInput);
        return;
      }

      if (!step.name) {
        this.emit(
          "error",
          new errors.MissingPropertyError(
            "name",
            this.head.page,
            this.head.index,
          ),
        );
        this.next();
        this.run();
        return;
      }

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

  /**
   * Update "head" to the link and index
   *
   * @param      link   Link
   * @param      index  Step index
   */
  navigate(link?: Link | null, index = 0) {
    if (link === null) {
      this.head.page = null;
      this.head.index = 0;
      this.head.stepsAmount = 0;
    }
    if (link) {
      let page = link;
      /**
       * If the link has a specific index, it will split it to
       * a page name and index.
       *
       * e.g. "/start[1]" will turn to "/start" and 1.
       */
      if (link.includes("[")) {
        /**
         * Removes the last character "]"
         */
        let foo = link.slice(0, -1);
        let bar = foo.split("[");
        page = bar[0];
        index = parseInt(bar[1]);
      }

      this.head.page = page;

      if (!Array.isArray(this.data.pages[page])) {
        this.head.stepsAmount = 1;
        return;
      }
      this.head.stepsAmount = (this.data.pages[page] as Step[]).length;
    }
    this.head.index = index;
  }

  /**
   * Gets the current step.
   *
   * If the current page is null, returns {}
   */
  getCurrentStep(): Step {
    if (!this.head.page) return {};
    return this.getStep(this.head.page, this.head.index);
  }

  /**
   * Substitutes all the variables in an object or string
   * without mutating the original object.
   *
   * @param      obj   A string, or a JSON-compatible object
   */
  substituteVariables<T>(obj: T): T {
    if (typeof obj === "string")
      return this.substituteVariablesInString(obj) as unknown as T;

    const outputObj = JSON.parse(JSON.stringify(obj));
    /**
     * Goes over every properties in the object, and
     * substitute the variables in every string.
     */
    const substitute = (obj: any) => {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === "object") {
          substitute(obj[key]);
          return;
        }
        if (typeof obj[key] === "string") {
          obj[key] = this.substituteVariablesInString(obj[key]);
        }
      });
    };

    substitute(outputObj);
    return outputObj;
  }

  /**
   * Substitutes all the variables in the
   * string.
   */
  private substituteVariablesInString(s: string): string {
    const pattern = /{{[^{]+}}/g;
    const out = s.replace(pattern, (varName) => {
      /**
       * Removes the "{{" and "}}"
       */
      const varPath = varName.slice(2, -2);
      return this.getVariableValue(varPath);
    });
    return out;
  }

  private getStep(page: string, index = 0): Step {
    if (typeof this.data.pages[page] === "undefined") {
      this.emit("error", new Error(`Page '${page}' does not exist.`));
      return {};
    }
    if (!Array.isArray(this.data.pages[page])) {
      return this.data.pages[page];
    }
    return this.data.pages[page][index];
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
      if (this.head.page === null) {
        this.setStatus(Status.WaitingInput);
        this.running = false;
        return;
      }

      const step = this.getCurrentStep();
      const needsInput = this.stepNeedsInput(step);

      if (step.clearVariables) {
        this.storage = {};
      }

      if (step.api) {
        const url = this.substituteVariables(step.api);
        try {
          const res = await fetch(url);
          const data = await res.json();
          this.storage[step.name!] = data;
        } catch (err) {
          // TODO: handle api error.
        }
      }

      this.emitOutput();

      if (needsInput) {
        this.stepsSinceLastInput = 0;
        if (typeof step.value !== "undefined") {
          this.storage[step.name!] = step.value;
          this.next();
          continue;
        }
        this.setStatus(Status.WaitingInput);
        this.running = false;
        return;
      }

      if (this.stepsSinceLastInput >= this.options.freefallLimit) {
        this.emit(
          "error",
          new errors.FreefallError(
            this.stepsSinceLastInput,
            this.head.page,
            this.head.index,
          ),
        );
        this.setStatus(Status.WaitingInput);
        this.running = false;
        this.navigate(null);
        return;
      }
      this.stepsSinceLastInput++;
      this.next();
    }
  }

  /**
   * Update "head" to the next step in a page.
   *
   * If there is a "next" property in the current
   * step, then it will update "head" to that
   * location instead.
   */
  private next() {
    const next = this.getCurrentStep().next;
    if (next) {
      this.navigate(next, 0);
      return;
    }

    /**
     * If the head is on the last step.
     */
    if (this.head.stepsAmount <= this.head.index + 1) {
      this.emit("steps-complete", this.storage);
      this.navigate(this.hasTriggers ? null : "/start", 0);
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
    message = this.substituteVariables(message);
    this.emit("output", message);
  }

  /**
   * Gets the value from path.
   *
   * @param      varPath  Variable path
   *
   * @example
   * this.getVariableValue("foo");
   * this.getVariableValue("foo.bar");
   * this.getVariableValue("foo.bar.2");
   */
  private getVariableValue(varPath: string): Value {
    const varNames = varPath.split(".");
    let head = this.storage;

    for (let i = 0; i < varNames.length; ++i) {
      const name = varNames[i];
      if (typeof head[name] === "undefined") return "";
      head = head[name];
    }

    return head;
  }

  private stepNeedsInput(step: Step): boolean {
    if (step.api) return false;
    return (
      typeof step.name !== "undefined" ||
      typeof step.links !== "undefined" ||
      step.userInput ||
      typeof step.values !== "undefined"
    );
  }
}
