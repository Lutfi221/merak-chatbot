import Storage from "./Storage";

test("Basic", () => {
  const storage = new Storage({
    car: {
      name: "Fiat",
      model: 500,
      features: ["ac", "heater", "lights"],
    },
  });

  expect(
    storage.expandString(
      "The {{car.name}} {{car.model}} has " +
        "{{car.features[0]}}, {{car.features[1]}}, and {{car.features[2]}}!",
    ),
  ).toBe("The Fiat 500 has " + "ac, heater, and lights!");

  expect(storage.expandString("The age is {{car.age}}")).toBe(
    "The age is {{car.age}}",
  );
});
