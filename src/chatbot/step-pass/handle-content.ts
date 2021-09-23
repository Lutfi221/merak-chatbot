import StepPass from "./StepPass";

const handleContent: StepPass = async (step, next, chatbot) => {
  if (!step.content) {
    next();
    return;
  }
  chatbot.emit("output", chatbot.getPrompt());
  next();
};

export default handleContent;
