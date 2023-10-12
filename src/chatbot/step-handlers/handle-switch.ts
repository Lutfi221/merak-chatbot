import { StepHandler } from "../Handle";

const handleSwitch: StepHandler = async (handle, next) => {
  if (!handle.step?.switch) {
    next();
    return;
  }

  const step = handle.step;
  const value = handle.storage.getValue(step.switch!.var);
  const valueStr = String(value);

  const caseStep = step.switch!.cases[valueStr] || step.switch!.default;

  if (caseStep) handle.step = { ...step, ...caseStep };
  delete handle.step.switch;

  next();
};

export default handleSwitch;
