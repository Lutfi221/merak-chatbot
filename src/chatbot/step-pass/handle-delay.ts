import StepPass from "./StepPass";
import { sleep } from "../../utils";

const handleDelay: StepPass = async (step, next) => {
  if (step.delay) {
    await sleep(step.delay * 1000);
  }
  next();
};

export default handleDelay;
