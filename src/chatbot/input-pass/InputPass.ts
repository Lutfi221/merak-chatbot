import { Step, Link } from "../index";
import Chatbot from "../Chatbot";

type InputPass = (
  input: string,
  step: Step,
  next: () => void,
  chatbot: Chatbot,
  setGoTo: (nextLink: Link) => void,
  setValid: (isValid: boolean) => void,
) => void;

export default InputPass;
