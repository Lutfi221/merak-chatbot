import { UnparsedData, Data } from "./index";

/**
 * Parse data to be used with Chatbot
 *
 * @param      data  JSON-compatible data
 */
export default (data: UnparsedData): Data => {
  const parsed = JSON.parse(JSON.stringify(data));
  const root = parsed.pages;

  const flatten = (path = "", obj: any): any => {
    for (let key in obj) {
      if (key[0] !== "/") continue;
      flatten(path + key, obj[key]);
      const page = obj[key];
      delete obj[key];
      root[path + key] = page;
    }
  };

  flatten("", root);

  return parsed;
};
