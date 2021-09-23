import StepPass from "./StepPass";
import fetch, { Response } from "node-fetch";
import { URLSearchParams } from "url";
import { Api } from "../index";

const handleApi: StepPass = async (step, next, chatbot, _, goTo) => {
  if (!step.api) {
    next();
    return;
  }

  let api: Api;
  let res: Response;
  let data: any;

  const handleApiFail = (err: Error) => {
    chatbot.emit("error", err);
    if (step.apiFailLink) {
      goTo(step.apiFailLink);
      return;
    }
    next();
  };

  if (typeof step.api === "string") {
    api = { url: step.api, method: "GET" };
  } else {
    api = step.api;
    if (!api.method) api.method = "GET";
  }

  api = chatbot.substituteVariables(api);

  if (api.method!.toUpperCase() === "POST") {
    let body: string;
    if (typeof api.body === "string") {
      body = api.body;
    } else {
      body = JSON.stringify(api.body);
    }
    try {
      res = await fetch(api.url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: body,
      });
    } catch (err) {
      handleApiFail(err as Error);
      return;
    }
  } else {
    try {
      let url = api.url;
      if (api.body) {
        url = api.url + "?" + new URLSearchParams(api.body).toString();
      }
      res = await fetch(url);
    } catch (err) {
      handleApiFail(err as Error);
      return;
    }
  }

  try {
    data = await res!.json();
  } catch (err) {
    handleApiFail(err as Error);
    return;
  }
  chatbot.storage[step.name!] = data;

  next();
};

export default handleApi;
