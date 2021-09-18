/**
 * A string starting with a "/", and optionally ending with an
 * index "[2]". The index starts at zero.
 *
 * This is used to navigate between pages.
 *
 * @example
 * // Examples of valid links
 * ["/start", "/home", "/order[2]"];
 */
export type Link = string;

export type Value = any;

export type Api = {
  url: string;
  method?: "GET" | "POST";
  body?: any;
};

export interface ExecuteAttribute {
  /**
   * The function's name
   */
  function: string;
  /**
   * The function's arguments.
   *
   * Variables will be substituted as usual.
   * You can disable this with the
   * "substituteVariablesInArgs" property.
   */
  args?: any[];
  /**
   * Substitute the variables in "args".
   * Defaults to false.
   */
  substituteVariables?: boolean;
}

/**
 * Basic step
 */
export type BaseStep = {
  /**
   * Text to be sent to the user.
   */
  content?: string;
  /**
   * Links mapped to their user input key.
   */
  links?: { [key: string]: Link };
  /**
   * The next page to go to.
   */
  next?: Link;
};

export interface Step extends BaseStep {
  /**
   * URL to be sent a request, or an api object.
   * 
   * @example
   * api=
      `https://telkomsel.com/api?` +
      `action=buy` +
      `&item={{item-name}}` +
      `&size={{item-size}}`
   */
  api?: string | Api;
  /**
   * The link to go to if the api
   * request was unsuccessful.
   */
  apiFailLink?: Link;
  /**
   * Deletes all variables.
   */
  clearVariables?: boolean;
  /**
   * The name where the value from the user
   * or api response will be stored.
   */
  name?: string;
  /**
   * If true, will take in anything the user inputs.
   *
   * This is used for requesting text inputs such as
   * the user's name, or birthday.
   */
  userInput?: boolean;
  /**
   * To validate the user input.
   */
  userInputValidator?: string | RegExp;
  /**
   * The message to show when the user inputs
   * something that doesn't matches
   * "userInputValidator".
   */
  invalidInputMessage?: string;
  /**
   * Values mapped to their user input key.
   */
  values?: { [key: string]: Value };
  /**
   * Will set the key's name to value.
   */
  value?: Value;
  /**
   * This value will be used when the user
   * inputs an invalid value, so the prompt
   * will not repeat.
   */
  defaultValue?: Value;
  /**
   * This link will be used when the user's
   * input doesn't match any of the 'links'.
   */
  defaultLink?: Link;
  /*
   * Simulates a user's input.
   * Variables will be substituted.
   */
  simulateInput?: string;
  /**
   * Execute a function and put its return value
   * to the variable specified in the "name"
   * attribute.
   */
  execute?: ExecuteAttribute;
  /**
   * How many seconds to wait until this step
   * starts running.
   */
  delay?: number;
}

export type Settings = {
  /**
   * Compare user input to triggers with
   * sensitivity to casing.
   *
   * Defaults to false.
   */
  caseSensitiveTrigger?: boolean;
};

export type Data = {
  settings?: Settings;
  /**
   * Map of triggers to page names
   */
  triggers?: { [trigger: string]: string };
  pages: { [link: string]: Step[] | Step };
};

export type UnparsedData = Data & {
  pages: { [link: string]: any };
};
