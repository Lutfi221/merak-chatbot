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

it("should convert step's `content`s with type array to string", () => {
  const unparsedData: any = {
    pages: {
      "/start": {
        content: "abcd",
      },
      "/1": {
        content: ["1abcd"],
        "/2": {
          content: ["2a", "b", "c", "d"],
          "/3": {
            content: ["3ab", "cd"],
          },
          "/4": {
            content: "4abcd",
          },
        },
      },
      "/9": {
        "/10": [{ content: ["10pqrs", "tuvw"] }, { content: "10xyz" }],
      },
    },
  };
  expect(parseData(unparsedData)).toMatchObject({
    pages: {
      "/start": { content: "abcd" },
      "/1/2/3": { content: "3abcd" },
      "/1/2/4": { content: "4abcd" },
      "/1/2": { content: "2abcd" },
      "/1": { content: "1abcd" },
      "/9/10": [{ content: "10pqrstuvw" }, { content: "10xyz" }],
      "/9": {},
    },
  });
});
