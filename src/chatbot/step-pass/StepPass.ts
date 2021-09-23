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
) => Promise<void>;

export default StepPass;
