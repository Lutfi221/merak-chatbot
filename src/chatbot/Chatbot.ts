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
import InputPass, {
  handleHeadNullPage,
  handleDefaults,
  handleLinks,
  handleValues,
  handleUserInput,
} from "./input-pass";

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
  /**
   * @deprecate check directly with chatbot.data.triggers instead
   */
  private hasTriggers = true;
  private running;
  private stepPasses: StepPass[] = [];
  private inputPasses: InputPass[] = [];
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
    this.pushDefaultInputPasses();
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

    const step = this.getCurrentStep();

    const { nextGoTo, valid } = this.processInput(input, step);

    if (nextGoTo && valid) {
      this.navigate(nextGoTo);
      await this.run();
      return;
    }

    if (valid) {
      this.next();
      await this.run();
      return;
    }

    if (typeof step.simulateInput !== "undefined") {
      const error = new errors.InvalidSimulatedInputError(
        input,
        this.head.page,
        this.head.index,
      );
      this.emit("error", error);
      this.next();
      await this.run();
      return;
    }

    if (step.invalidInputMessage) {
      this.emitOutput(step.invalidInputMessage);
    } else {
      this.emitOutput(step.content);
    }
    this.setStatus(Status.WaitingInput);
  }

  /**
   * Process input without navigating the page.
   *
   * @param      input  User input
   * @param      step   The step
   */
  processInput(
    input: string,
    step = this.getCurrentStep(),
  ): {
    nextGoTo: Link | undefined;
    valid: boolean;
  } {
    let shouldContinue = false;
    let nextGoTo: string | undefined;
    let valid = false;

    const next = () => (shouldContinue = true);
    const setGoTo = (link: Link) => {
      nextGoTo = link;
      valid = true;
    };
    const setValid = (isValid: boolean) => (valid = isValid);

    for (let i = 0; i < this.inputPasses.length; i++) {
      this.inputPasses[i](input, step, next, this, setGoTo, setValid);
      if (!shouldContinue) break;
      shouldContinue = false;
    }

    return { nextGoTo, valid };
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
      link = this.subVarPaths(link);
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
      let nextLink: Link | undefined;

      const next = () => (shouldContinue = true);
      const waitInput = () => this.setStatus(Status.WaitingInput);
      const goTo = (nextLinkToGo: Link) => (nextLink = nextLinkToGo);

      for (let i = 0; i < this.stepPasses.length; i++) {
        await this.stepPasses[i](step, next, this, waitInput, goTo);
        if (!shouldContinue) break;
        shouldContinue = false;
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

  private pushDefaultInputPasses() {
    this.inputPasses = [
      handleHeadNullPage,
      handleDefaults,
      handleLinks,
      handleValues,
      handleUserInput,
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
