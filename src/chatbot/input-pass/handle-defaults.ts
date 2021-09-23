import InputPass from "./InputPass";

const handleDefaults: InputPass = (
  _,
  step,
  next,
  chatbot,
  setGoTo,
  setValid,
) => {
  if (typeof step.defaultValue !== "undefined") {
    setValid(true);
    chatbot.storage[step.name!] = step.defaultValue;
  }

  if (typeof step.defaultLink !== "undefined") {
    setGoTo(step.defaultLink);
  }
  next();
};

export default handleDefaults;
