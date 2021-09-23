import StepPass from "./StepPass";

const handleExecute: StepPass = async (step, next, chatbot) => {
  if (!step.execute) {
    next();
    return;
  }
  let args = step.execute.args || [];

  if (step.execute.substituteVariables) {
    args = chatbot.substituteVariables(args);
  }

  let output = await chatbot.execute(step.execute.function, args);

  chatbot.storage[step.name!] = output;
  next();
};

export default handleExecute;
