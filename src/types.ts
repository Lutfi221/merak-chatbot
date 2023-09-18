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

export type Step = BaseStep;

export type FlowData = {
  pages: { [link: string]: Step[] };
};
