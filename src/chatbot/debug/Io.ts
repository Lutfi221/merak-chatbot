import { Message } from "../types";

export type IoType = "input" | "output";

type Io = {
  type: IoType;
  msg: Message;
};

export default Io;
