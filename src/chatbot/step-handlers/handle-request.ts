import fetch, { RequestInit } from "node-fetch";
import { RequestProperty } from "../../types";
import { StepHandler } from "../Handle";

const handleRequest: StepHandler = async (handle, next) => {
  if (!handle.step?.request) {
    next();
    return;
  }

  const sr: RequestProperty = {
    expandBody: true,
    expandUrl: true,
    ...handle.step.request,
  };

  if (sr.expandUrl) sr.url = handle.storage.expandString(sr.url);
  if (sr.expandBody) sr.body = handle.storage.expandObject(sr.body);

  if (sr.method === "GET" && sr.body !== undefined) {
    throw new Error(
      "Attempted to send a GET request with a body property.\n" +
        "If you want to pass a body with your request, use a POST request.",
    );
  }

  const reqObj: RequestInit = { method: sr.method };

  if (sr.body !== undefined) {
    reqObj.headers = { "Content-Type": "application/json" };
    reqObj.body = JSON.stringify(sr.body);
  }

  const res = await fetch(sr.url, reqObj);

  if (sr.var) {
    let text = await res.text();
    let parsed: any;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
    }

    if (parsed !== undefined) handle.storage.setValue(sr.var, parsed);
    else handle.storage.setValue(sr.var, text);
  }

  next();
};

export default handleRequest;
