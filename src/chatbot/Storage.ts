/**
 * Facilitates the storage and retrieval of data.
 */
export default class Storage {
  static PLACEHOLDER_PATTERN = /{{[[\w\[\]\.]+}}/g;
  dictionary: any;

  constructor(initial: any = {}) {
    this.dictionary = initial;
  }

  /**
   * Expands string containing variable placeholders.
   * @param s
   * @returns Expanded string.
   */
  expandString(s: string) {
    return s.replace(Storage.PLACEHOLDER_PATTERN, (valuePath) => {
      // Removes the `{{` and `}}`
      valuePath = valuePath.slice(2, -2);

      const value = this.getValue(valuePath);

      if (value !== undefined) return value as string;

      return "{{" + valuePath + "}}";
    });
  }

  /**
   * Gets a value from dictionary.
   * @param valuePath
   * @returns Value or undefined.
   */
  getValue(valuePath: string): unknown | void {
    const splits = valuePath.split(".");
    let components: (string | number)[] = [];

    splits.forEach((s) => {
      const m = s.match(/(\w+)\[(\d+)\]/);
      if (m) {
        components.push(m[1]);
        components.push(parseInt(m[2]));
      } else {
        components.push(s);
      }
    });

    let head = this.dictionary;

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      if (typeof head[component] === "undefined") return;
      head = head[component];
    }

    return head;
  }
}
