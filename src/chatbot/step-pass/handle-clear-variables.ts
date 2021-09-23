import StepPass from "./StepPass";

const handleClearVariables: StepPass = async (step, next, chatbot) => {
  if (step.clearVariables === true) {
    chatbot.storage = {};
  }
  next();
};

export default handleClearVariables;
