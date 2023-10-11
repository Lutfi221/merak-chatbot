import { handleNext } from ".";
import Handle from "../Handle";
import Storage from "../Storage";
import { Link } from "../types";

it("should set Handle.nextLink to the correct link", async () => {
  const handle = new Handle({
    step: {
      next: "/shop",
    },
  });

  await handleNext(handle, () => {});
  expect(handle.nextLink).toEqual(Link.fromLinkString("/shop"));
});

it("should expand variables in Handle.nextLink", async () => {
  const handle = new Handle({
    step: {
      next: "/shop/{{item.name}}/{{item.color}}",
    },
    storage: new Storage({ item: { name: "sword", color: "gold" } }),
  });

  await handleNext(handle, () => {});
  expect(handle.nextLink).toEqual(Link.fromLinkString("/shop/sword/gold"));
});
