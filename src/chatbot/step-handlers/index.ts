import { StepHandler } from "../Handle";
import { Link } from "../types";

import handleExecute from "./handle-execute";
import handleRequest from "./handle-request";
import handleSwitch from "./handle-switch";

export const handleMessage: StepHandler = async (handle, next) => {
  const step = handle.step;
  if (step?.msg) {
    let msg: string;

    if (Array.isArray(step.msg) && step.msg.every((s) => typeof s === "string"))
      msg = step.msg.join("");
    else msg = step.msg as string;

    msg = handle.storage.expandString(msg);
    handle.print(msg);
  }

  next();
};

export const handleNext: StepHandler = async (handle, next) => {
  const step = handle.step;
  if (step?.next)
    handle.nextLink = Link.fromLinkString(
      handle.storage.expandString(step.next),
    );

  next();
};

export const handleLinks: StepHandler = async (handle, next) => {
  const step = handle.step;

  if (step?.links) {
    const input = String(await handle.getInput());
    if (input in step.links)
      handle.nextLink = Link.fromLinkString(
        handle.storage.expandString(step.links[input]),
      );
    else handle.rejectInput(`Input a valid link choice.`);
  }

  next();
};

export const handleInput: StepHandler = async (handle, next) => {
  const step = handle.step;

  if (!step?.input) {
    next();
    return;
  }

  const input = step.input;

  if (input.type === "set") {
    handle.storage.setValue(input.var, input.value);
    next();
    return;
  }

  const userInput = String(await handle.getInput());

  if (input.type === "choice") {
    if (userInput in input.choices!) {
      handle.acceptInput();
      handle.storage.setValue(input.var, input.choices![userInput]);
    } else
      handle.rejectInput(
        input.rejectMsg || "Invalid choice. Please input a valid choice.",
      );

    next();
    return;
  }

  if (input.type === "text") {
    if (input.pattern) {
      let p: RegExp;
      if (typeof input.pattern === "string") p = RegExp(input.pattern);
      else p = input.pattern;

      if (!p.test(userInput)) {
        handle.rejectInput(
          input.rejectMsg ||
            "Invalid input. \n" +
              "The input doesn't match the required pattern.",
        );
        next();
        return;
      }
    }
    handle.acceptInput();
    handle.storage.setValue(input.var, userInput);

    next();
    return;
  }

  throw new Error("Unknown input type.");
};

export const DEFAULT_STEP_HANDLERS: StepHandler[] = [
  handleSwitch,
  handleMessage,
  handleNext,
  handleInput,
  handleLinks,
  handleExecute,
  handleRequest,
];
