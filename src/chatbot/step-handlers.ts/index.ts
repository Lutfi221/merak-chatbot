import { StepHandler } from "../Handle";
import { Link } from "../types";

export const handleMessage: StepHandler = async (handle, next) => {
  const step = handle.step;
  if (step?.msg) handle.print(step.msg);

  next();
};

export const handleNext: StepHandler = async (handle, next) => {
  const step = handle.step;
  if (step?.next) handle.nextLink = Link.fromLinkString(step.next);

  next();
};

export const handleLinks: StepHandler = async (handle, next) => {
  const step = handle.step;

  if (step?.links) {
    const input = String(await handle.getInput());
    if (input in step.links)
      handle.nextLink = Link.fromLinkString(step.links[input]);
    else handle.rejectInput(`Input a valid link choice.`);
  }

  next();
};
