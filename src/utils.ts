export const getVarValueFromPath = (path: string, obj: any): any => {
  const varNames = path.split(".");
  let head = obj;

  for (let i = 0; i < varNames.length; ++i) {
    const name = varNames[i];
    if (typeof head[name] === "undefined") return;
    head = head[name];
  }

  return head;
};

export const subVarPathsInString = (
  s: string,
  obj: any,
  noLeftovers = true,
  pattern = /{{[^{]+}}/g,
  sliceEndsAmount = 2,
): string => {
  const out = s.replace(pattern, (varString) => {
    /**
     * Removes the "{{" and "}}"
     */
    const varPath = varString.slice(sliceEndsAmount, -sliceEndsAmount);
    const value = getVarValueFromPath(varPath, obj);

    if (typeof value !== "undefined") {
      return value;
    }
    if (noLeftovers) return "";
    return varString;
  });
  return out;
};

export const subVarPathsInObjectProps = <T>(
  toBeSubstituted: T,
  sourceObj: any,
  subVarPathsInStr = subVarPathsInString,
): T => {
  if (typeof toBeSubstituted === "string")
    return subVarPathsInStr(toBeSubstituted, sourceObj) as unknown as T;

  const outputObj = JSON.parse(JSON.stringify(toBeSubstituted));
  /**
   * Goes over every properties in the object, and
   * substitute the variables in every string.
   */
  const substitute = (obj: any) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === "object") {
        substitute(obj[key]);
        return;
      }
      if (typeof obj[key] === "string") {
        obj[key] = subVarPathsInStr(obj[key], sourceObj);
      }
    });
  };

  substitute(outputObj);
  return outputObj;
};

export const escapeStringRegexp = (s: string) =>
  s.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");

/**
 * Pause code execution.
 *
 * @param      ms    How long (in milliseconds) to sleep.
 */
export const sleep = (ms: number) => {
  return new Promise((res) => setTimeout(res, ms));
};
