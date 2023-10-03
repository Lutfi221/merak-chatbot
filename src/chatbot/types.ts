import { LinkString, Step } from "../types";
import Head from "./Head";
import Storage from "./Storage";

export type Message =
  | string
  | {
      toString: () => string;
    };

export enum Status {
  Paused,
  WaitingInput,
  Busy,
}

export type Options = {
  /**
   * The limit of steps without a required input.
   * This helps detect freefalling or infinite loops.
   */
  freefallLimit?: number;
};

export class Link {
  pageLink: string;
  index: number;
  constructor(pageLink: string, index = 0) {
    this.pageLink = pageLink;
    this.index = index;
  }

  toLinkString(): LinkString {
    return `${this.pageLink}[${this.index}]`;
  }

  static fromLinkString(linkString: LinkString): Link {
    if (linkString.endsWith("]")) {
      const [pageLink, post] = linkString.split("[");
      const index = parseInt(post.slice(0, -1));
      return new Link(pageLink, index);
    }

    return new Link(linkString);
  }
}

export type Events = {
  input: (message: Message) => void;
  output: (message: Message) => void;
  "status-change": (status: Status) => void;
  "status-change-waiting-input": () => void;
  "page-complete": (storage: Storage) => void;
  "step-complete": (step: Step) => void;
  error: (error: Error) => void;
  idle: (prevHead: Head, step: Step) => void;
  exit: () => void;
};

export type ChatbotFunction = (...args: any) => any;
export type ChatbotFunctionDictionary = { [name: string]: ChatbotFunction };
