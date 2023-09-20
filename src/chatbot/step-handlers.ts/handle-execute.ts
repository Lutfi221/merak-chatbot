import { FunctionProperty } from "../../types";
import { StepHandler } from "../Handle";
import Storage from "../Storage";

const handleExecute: StepHandler = async (handle, next) => {
  const step = handle.step;
  if (!step?.execute) {
    next();
    return;
  }

  const sx: FunctionProperty = { expandArgs: true, ...step.execute };

  let finalArgs: any[] = [];

  if (sx.args) {
    for (let arg of sx.args) {
      if (
        sx.expandArgs &&
        typeof arg === "string" &&
        Storage.isLonePlaceholder(arg)
      ) {
        const value = handle.storage.getValueFromLonePlaceholder(arg);
        finalArgs.push(value);
      } else {
        finalArgs.push(arg);
      }
    }
  }

  const output = handle.functions[sx.fn](...finalArgs);
  if (sx.var && output !== undefined) handle.storage.setValue(sx.var, output);

  next();
};

export default handleExecute;
