import EventEmitter from "events";
import TypedEmitter from "../../types/typed-emitter";
import { Data, UnparsedData, Link, Step } from "./index";
import * as errors from "./errors";
import parseData from "./parse-data";
import {
  subVarPathsInString,
  subVarPathsInObjectProps,
  getVarValueFromPath,
  escapeStringRegexp,
} from "../utils";
import StepPass, {
  handleApi,
  handleClearVariables,
  handleContent,
  handleDelay,
  handleExecute,
  handleInput,
} from "./step-pass";

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
  /**
   * Stores variables that will not get cleared by 'clearVariables',
   * and can only be overwritten programmatically.
   */
  globalStorage: Storage = {};
  status = Status.Uninitialized;
  readonly options: Required<Options>;
  private nameToFunction: { [name: string]: (...args: any[]) => any } = {};

  inputs: string[] = [];
  outputs: string[] = [];
  private stepsSinceLastInput = 0;
  private hasTriggers = true;
  private running;
  private stepPasses: StepPass[] = [];
  constructor(data: UnparsedData, options: Options = {}) {
    super();
    if (!data.triggers) {
      this.hasTriggers = false;
      this.head.page = "/start";
      if (Array.isArray(data.pages["/start"])) {
        this.head.stepsAmount = (data.pages["/start"] as Step[]).length;
      }
    }

    this.data = parseData(data);
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.running = false;

    if (this.options.outputRecordingEnabled) {
      this.on("output", (msg) => {
        this.outputs.push(msg);
      });
    }

    this.pushDefaultStepPasses();
    this.registerDefaultFunctions();
  }

  /**
   * Gets the text content from the current step.
   *
   * @param      varSubEnabled  Substitute the variabes in the string if true
   *
   * @return     The prompt.
   */
  getPrompt(varSubEnabled = true): string {
    const output = this.getCurrentStep().content || "";
    if (varSubEnabled) return this.subVarPathsInString(output);
    return output;
  }

  /**
   * Initializes the chatbot.
   */
  async initialize() {
    if (this.status === Status.Uninitialized) await this.run();
  }

  /**
   * Inputs user submitted text.
   *
   * This method will return when chatbot.status changed
   * to "WAITING_INPUT".
   *
   * @param      input   User input
   * @param      silent  If true, the input will not be recorded.
   * @param      forced  Forcefully input if true.
   */
  async input(input = "", silent = false, forced = false) {
    if (this.options.inputRecordingEnabled && !silent) {
      this.inputs.push(input);
    }

    if (this.status !== Status.WaitingInput && !forced) return;
    if (!input) return;

    this.setStatus(Status.Busy);

    if (this.head.page === null) {
      if (!this.hasTriggers) {
        this.navigate("/start");
        await this.run();
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
          await this.run();
          return;
        }
      }
      this.setStatus(Status.WaitingInput);
    }

    const step = this.getCurrentStep();
    const defaultValueDefined = typeof step.defaultValue !== "undefined";
    const simulateInputDefined = typeof step.simulateInput !== "undefined";
    let inputMatchedWithValues = false;
    let link: Link = "";

    if (defaultValueDefined) {
      this.storage[step.name!] = step.defaultValue;
    }

    if (step.defaultLink) {
      link = step.defaultLink;
    }

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
          this.storage[step.name!] = step.values[key];
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
      await this.run();
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
        if (defaultValueDefined) {
          this.next();
          await this.run();
          return;
        }
        if (simulateInputDefined) {
          this.emit(
            "error",
            new errors.InvalidSimulatedInputError(
              input,
              this.head.page,
              this.head.index,
            ),
          );
          this.next();
          await this.run();
          return;
        }
        this.emitOutput(step.invalidInputMessage);
        this.setStatus(Status.WaitingInput);
        return;
      }

      this.storage[step.name!] = input;
    }

    /**
     * If the user's input doesn't matched anything
     */
    if (!step.userInput && !inputMatchedWithValues) {
      if (defaultValueDefined) {
        this.next();
        await this.run();
        return;
      }
      if (simulateInputDefined) {
        this.emit(
          "error",
          new errors.InvalidSimulatedInputError(
            input,
            this.head.page,
            this.head.index,
          ),
        );
        this.next();
      }
      await this.run();
      return;
    }

    this.next();
    await this.run();
  }

  /**
   * Update "head" to the link and index
   * @deprecated This method will be privatized in the next major update. Use
   *             'navigateAndRun' instead.
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
   * Navigate to link and run.
   *
   * @param      link   The link
   * @param      index  The step index
   */
  async navigateAndRun(link?: Link | null, index = 0) {
    if (this.status === Status.Busy) {
      const error = new errors.StatusError(
        `The chatbot's status is currently 'BUSY'.\n` +
          `'navigateAndRun' cannot be called when the chatbot's status is 'BUSY'.`,
        Status.Busy,
      );
      this.emit("error", error);
      throw error;
    }
    this.navigate(link, index);
    this.setStatus(Status.Busy);
    await this.run();
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

  registerFunction(name: string, fn: (...args: any[]) => any) {
    this.nameToFunction[name] = fn;
  }

  /**
   * @deprecated Use 'subVarPaths' instead
   */
  substituteVariables<T>(obj: T): T {
    return this.subVarPaths(obj);
  }

  /**
   * Substitutes all the variables in an object or string
   * without mutating the original object.
   *
   * @param      obj   A string, or a JSON-compatible object
   */
  subVarPaths<T>(obj: T): T {
    return subVarPathsInObjectProps(obj, undefined, (s: string) =>
      this.subVarPathsInString(s),
    );
  }

  private getVarValueFromPath(path: string): any {
    let value = getVarValueFromPath(path, this.storage);
    if (typeof value === "undefined")
      return getVarValueFromPath(path, this.globalStorage);
    return value;
  }

  /**
   * Substitutes all the variable paths in the
   * string.
   */
  private subVarPathsInString(s: string): string {
    let output = subVarPathsInString(s, this.storage, false);
    output = subVarPathsInString(output, this.globalStorage);
    return output;
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
      let shouldContinue = false;
      let simulatedInput: string | undefined;
      let nextLink: Link | undefined;

      const next = () => (shouldContinue = true);
      const waitInput = () => this.setStatus(Status.WaitingInput);
      const goTo = (nextLinkToGo: Link) => (nextLink = nextLinkToGo);
      /**
       * This is a temporary solution.
       */
      const simulateInput = (s: string) => {
        simulatedInput = s;
      };

      for (let i = 0; i < this.stepPasses.length; i++) {
        await this.stepPasses[i](
          step,
          next,
          this,
          waitInput,
          goTo,
          simulateInput,
        );
        if (!shouldContinue) break;
        shouldContinue = false;
      }

      if (typeof simulatedInput !== "undefined") {
        this.running = false;
        await this.input(simulatedInput, true, true);
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

      if (nextLink) {
        this.navigate(nextLink);
        continue;
      }
      if ((this.status as Status) === Status.WaitingInput) {
        this.stepsSinceLastInput = 0;
        break;
      }
      this.next();
    }

    this.running = false;
  }

  /**
   * Update "head" to the next step in a page.
   *
   * If there is a "next" property in the current
   * step, then it will update "head" to that
   * location instead.
   */
  next() {
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

  async execute(name: string, args: any[]): Promise<any> {
    let output: any;
    if (!(name in this.nameToFunction)) {
      this.emit(
        "error",
        new errors.FunctionNotFoundError(name, this.head.page, this.head.index),
      );
      return;
    }
    try {
      output = await this.nameToFunction[name](...args);
      return output;
    } catch (err) {
      this.emit("error", err as Error);
    }
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
    } else {
      message = this.substituteVariables(message);
    }
    this.emit("output", message);
  }

  stepNeedsInput(step: Step): boolean {
    if (step.api) return false;
    if (step.execute) return false;
    return (
      typeof step.name !== "undefined" ||
      typeof step.links !== "undefined" ||
      step.userInput ||
      typeof step.values !== "undefined"
    );
  }

  private pushDefaultStepPasses() {
    this.stepPasses = [
      handleDelay,
      handleClearVariables,
      handleApi,
      handleExecute,
      handleContent,
      handleInput,
    ];
  }

  private registerDefaultFunctions() {
    this.registerFunction(
      "forEach",
      (pathToArray: string, template: string, varSymbol = "%") => {
        const array: any[] = this.getVarValueFromPath(pathToArray);
        const varSymbolEscaped = escapeStringRegexp(varSymbol);
        const varPattern = new RegExp(
          `(${varSymbolEscaped})[^${varSymbolEscaped}]+(${varSymbolEscaped})`,
          "g",
        );

        let output = "";
        array.forEach((value, index) => {
          /**
           * Substitute all the variables with percentages.
           *
           * e.g. %value% %index%
           */
          let toBeAdded = subVarPathsInString(
            template,
            {
              value: value,
              index: index,
              humanIndex: index + 1,
            },
            true,
            varPattern,
            1,
          );
          /**
           * Substitute all the regular variables.
           *
           * e.g. {{name}} {{value}}
           */
          toBeAdded = this.subVarPathsInString(toBeAdded);
          output += toBeAdded;
        });
        return output;
      },
    );
  }
}
