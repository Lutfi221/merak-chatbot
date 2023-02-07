import { UnparsedData, Data, Step } from "./index";

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

  // Converts all step's content with type array to a string.
  for (const pageName in parsed.pages) {
    const page: Step[] | Step = parsed.pages[pageName];

    if (Array.isArray(page)) {
      for (const step of page)
        if (Array.isArray(step.content)) step.content = step.content.join("");
      continue;
    }

    if (Array.isArray(page.content)) page.content = page.content.join("");
  }

  return parsed;
};
