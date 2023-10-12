import { FlowData, Step } from "../types";
import { ChatbotError } from "./errors";
import { Link } from "./types";

export default class Head {
  link: Link | null;

  private _data: FlowData;

  constructor(data: FlowData) {
    this._data = data;
    this.link = new Link("/start", 0);
  }

  navigate(target: Link | null) {
    try {
      this.getStep(target);
    } catch (e) {
      throw new ChatbotError(
        this.link!,
        `Cannot navigate to '${target?.toLinkString()}'`,
      );
    }

    this.link = target;
  }

  get step(): Step | null {
    return this.getStep(this.link);
  }

  get nextLink(): Link | null {
    if (!this.link) return null;
    if (this.link.index >= this._data.pages[this.link.pageLink].length - 1)
      return null;
    return new Link(this.link.pageLink, this.link.index + 1);
  }

  private getStep(link: Link | null): Step | null {
    if (link == null) return null;
    return this._data.pages[link.pageLink][link.index];
  }
}
