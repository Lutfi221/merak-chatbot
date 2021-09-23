import { Step, Link } from "../index";
import Chatbot from "../Chatbot";

/**
 * @param      step  Current step
 */
type StepPass = (
  step: Step,
  next: () => void,
  chatbot: Chatbot,
  waitInput: () => void,
  goTo: (nextLink: Link) => void,
  /**
   * This is a temporary workaround.
   */
  simulateInput: (input: string) => void,
) => Promise<void>;

export default StepPass;
