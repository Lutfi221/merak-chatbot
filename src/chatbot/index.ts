/**
 * A string starting with a "/". This is used to navigate between pages.
 *
 * @example
 * // Examples of valid links
 * ["/start", "/home", "/order"];
 */
export type Link = string;

export type Value = any;

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
   * URL to be sent a request.
   * 
   * @example
   * api=
      `https://telkomsel.com/api?` +
      `action=buy` +
      `&item={{item-name}}` +
      `&size={{item-size}}`
   */
  api?: string;
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
   * Simulates a user's input.
   * Will set the key's name to value.
   */
  value?: Value;
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
  pages: { [link: string]: Step[] };
};
