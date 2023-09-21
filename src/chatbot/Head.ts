import { FlowData, Step } from "../types";
import { Link } from "./types";

export default class Head {
  link: Link | null;

  private _data: FlowData;

  constructor(data: FlowData) {
    this._data = data;
    this.link = new Link("/start", 0);
  }

  navigate(target: Link | null) {
    this.link = target;
  }

  get step(): Step | null {
    if (this.link == null) return null;
    return this._data.pages[this.link.pageLink][this.link.index];
  }

  get nextLink(): Link | null {
    if (!this.link) return null;
    if (this.link.index >= this._data.pages[this.link.pageLink].length - 1)
      return null;
    return new Link(this.link.pageLink, this.link.index + 1);
  }
}
