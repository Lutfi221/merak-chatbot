import InputPass from "./InputPass";

const handleLinks: InputPass = async (input, step, next, _, setGoTo) => {
  if (!step.links) {
    next();
    return;
  }

  for (let key in step.links) {
    if (input === key) {
      setGoTo(step.links[key]);
    }
  }
  next();
};

export default handleLinks;
