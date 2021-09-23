import StepPass from "./StepPass";

const handleInput: StepPass = async (
  step,
  next,
  chatbot,
  waitInput,
  _,
  simulateInput,
) => {
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
    simulateInput(chatbot.substituteVariables(step.simulateInput));
    return;
  }

  waitInput();
  return;
};

export default handleInput;
