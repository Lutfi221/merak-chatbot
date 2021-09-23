import InputPass from "./InputPass";

const handleUserInput: InputPass = async (
  input,
  step,
  next,
  chatbot,
  _,
  setValid,
) => {
  if (!step.userInput) {
    next();
    return;
  }
  let pattern: RegExp;

  if (!step.userInputValidator) {
    pattern = RegExp("");
  } else if (typeof step.userInputValidator === "string") {
    pattern = RegExp(step.userInputValidator);
  } else {
    pattern = step.userInputValidator;
  }

  if (!pattern.test(input)) {
    next();
    return;
  }

  chatbot.storage[step.name!] = input;
  setValid(true);
  next();
};

export default handleUserInput;
