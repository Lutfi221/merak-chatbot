import InputPass from "./InputPass";

const handleValues: InputPass = async (
  input,
  step,
  next,
  chatbot,
  _,
  setValid,
) => {
  if (!step.values) {
    next();
    return;
  }
  for (let key in step.values) {
    if (input === key) {
      chatbot.storage[step.name!] = step.values[key];
      setValid(true);
      break;
    }
  }
  next();
};

export default handleValues;
