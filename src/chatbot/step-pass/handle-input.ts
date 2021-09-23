import StepPass from "./StepPass";
import { InvalidSimulatedInputError } from "../errors";

const handleInput: StepPass = async (step, next, chatbot, waitInput, goTo) => {
  const needsInput = chatbot.stepNeedsInput(step);

  if (!needsInput) {
    next();
    return;
  }

  if (typeof step.value !== "undefined") {
    chatbot.storage[step.name!] = step.value;
    next();
    return;
  }

  if (step.simulateInput) {
    const input = chatbot.substituteVariables(step.simulateInput);
    const { nextGoTo, valid } = chatbot.processInput(input, step);

    if (nextGoTo) goTo(nextGoTo);
    if (!valid) {
      const error = new InvalidSimulatedInputError(
        input,
        chatbot.head.page,
        chatbot.head.index,
      );
      chatbot.emit("error", error);
    }

    next();
    return;
  }

  waitInput();
  return;
};

export default handleInput;
