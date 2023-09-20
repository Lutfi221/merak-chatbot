import { Message } from "./chatbot/types";

/**
 * A string starting with a `/`, and optionally ending with an
 * index `[2]`. The index starts at zero.
 *
 * - `/start`
 * - `/home`
 * - `/order[2]`
 */
export type LinkString = string;

export type Value = any;

export type BaseStep = {
  msg?: Message;
  links?: { [key: string]: LinkString };
  next?: LinkString;
};

export interface InputProperty {
  type: "text" | "choice" | "set";
  var: string;

  rejectMsg?: Message;

  pattern?: string | RegExp;
  choices?: { [key: string]: Value };
  value?: any;
  expandValue?: boolean;
}

export interface FunctionProperty {
  var?: string;
  fn: string;
  args?: any[];
  expandArgs?: boolean;
}

export interface RequestProperty {
  var?: string;
  url: string;
  method: "GET" | "POST";
  body?: any;

  expandUrl?: boolean;
  expandBody?: boolean;
}

export type Step = BaseStep & {
  input?: InputProperty;
  execute?: FunctionProperty;
  request?: RequestProperty;
};

export type FlowData = {
  pages: { [link: string]: Step[] };
};
