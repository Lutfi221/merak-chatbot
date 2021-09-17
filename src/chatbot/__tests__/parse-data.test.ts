import parseData from "../parse-data";

test("parse data", () => {
  const unparsedData: any = {
    triggers: { hai: "/start" },
    pages: {
      "/start": {
        sProp: 1,
      },
      "/a": {
        aProp: 1,
        "/b": {
          bProp: 1,
          "/c": {
            cProp: 1,
          },
          "/c1": {
            c1Prop: 1,
          },
        },
      },
      "/z": {
        "/x": [{ x1Prop: 1 }, { x2Prop: 1 }],
      },
    },
  };
  expect(parseData(unparsedData)).toMatchObject({
    triggers: { hai: "/start" },
    pages: {
      "/start": { sProp: 1 },
      "/a/b/c": { cProp: 1 },
      "/a/b/c1": { c1Prop: 1 },
      "/a/b": { bProp: 1 },
      "/a": { aProp: 1 },
      "/z/x": [{ x1Prop: 1 }, { x2Prop: 1 }],
      "/z": {},
    },
  });
});
