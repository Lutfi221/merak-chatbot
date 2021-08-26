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
 * Basic page
 */
export type BasePage = {
  /**
   * Text to be sent to the user.
   */
  content?: string;
  /**
   * Links mapped to their user input key.
   */
  links?: { [key: string]: Link };
};

/**
 * Page to request input from the user.
 */
export interface Page extends BasePage {
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
   * The name where the value will be stored.
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
   * Values mapped to their user input key.
   */
  values?: { [key: string]: Value };
}

export type Data = {
  pages: { [link: string]: Page[] };
};

export { default } from "./Chatbot";
