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
   * Expand placeholders within the object.
   * @param obj Object that contains strings that has variable placeholders.
   * @returns Deeply cloned object with the placeholders expanded.
   */
  expandObject(obj: any): any {
    return transformDeepPrimitiveValues(obj, (v) => {
      if (typeof v !== "string") return v;
      if (Storage.isLonePlaceholder(v))
        return this.getValueFromLonePlaceholder(v);
      return this.expandString(v);
    });
  }

  /**
   * Gets a value from dictionary.
   * @param valuePath
   * @returns Value or undefined.
   */
  getValue(valuePath: string): unknown | void {
    const components = getValuePathComponents(valuePath);
    let head = this.dictionary;

    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      if (typeof head[component] === "undefined") return;
      head = head[component];
    }

    return head;
  }

  getValueFromLonePlaceholder(lonePlaceholder: string): unknown | void {
    return this.getValue(lonePlaceholder.slice(2, lonePlaceholder.length - 2));
  }

  /**
   * Sets a value in the dictionary.
   */
  setValue(valuePath: string, value: any) {
    const components = getValuePathComponents(valuePath);
    let head = this.dictionary;

    for (let i = 0; i < components.length - 1; i++) {
      const component = components[i];

      if (typeof head[component] === "undefined") {
        if (typeof components[i + 1] === "number") head[component] = [];
        else head[component] = {};
      }

      head = head[component];
    }

    head[components[components.length - 1]] = value;
  }

  /**
   * @returns True if the string **only** contains a variable placeholder.
   */
  static isLonePlaceholder(s: string) {
    return s.match(Storage.PLACEHOLDER_PATTERN)?.[0].length === s.length;
  }
}

const getValuePathComponents = (valuePath: string): (string | number)[] => {
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

  return components;
};

/**
 * Applies a transform to each low-level (non arrays and non objects) values.
 * @param obj Object to be transformed.
 * @param valueTransform Transformation function.
 * @returns Transformed object.
 */
const transformDeepPrimitiveValues = (
  obj: any,
  valueTransform: (value: any) => any,
): any => {
  if (Array.isArray(obj)) {
    return obj.map((x) => transformDeepPrimitiveValues(x, valueTransform));
  }

  if (typeof obj === "object") {
    const output: any = {};
    for (let key in obj) {
      output[key] = transformDeepPrimitiveValues(obj[key], valueTransform);
    }
    return output;
  }

  return valueTransform(obj);
};
