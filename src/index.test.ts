import { Store } from "./index";
import { equals, like, not, any } from "./query";

const puppies: any[] = [
  {
    name: "Fido",
    owner: "Fred",
    image: "/images/puppy1.jpg",
    breed: "Labrador",
  },
  {
    name: "Coco",
    owner: "Chloe",
    image: "/images/puppy2.jpg",
    breed: "Labrador",
  },
  {
    name: "Magnum",
    owner: "Michael",
    image: "/images/puppy3.jpg",
    breed: "Rottweiler",
  },
  {
    name: "Sadie",
    owner: "Sam",
    image: "/images/puppy4.jpg",
    breed: "Labrador",
  },
  {
    name: "Murphy",
    owner: "Matthew",
    image: "/images/puppy5.jpg",
    breed: "Pug",
  },
  {
    name: "Bella",
    owner: "Brianna",
    weight: 73,
    image: "/images/puppy6.jpg",
    breed: "Labrador",
  },
  {
    name: "Rocky",
    owner: "Ricky",
    image: "/images/puppy7.jpg",
    breed: "Labrador",
  },
];

describe("fancy queries", () => {
  it("gets all the right stuff", async () => {
    const { add, query, close } = Store(":memory:");
    for (const puppy of puppies) {
      await add(puppy);
    }

    const results = await query((select) =>
      select
        .where(($, col) => $.eq($.get(col, "breed"), $.val("Labrador")))
        .where(($, col) => $.not($.like($.get(col, "owner"), "Ric%")))
        .orderBy("owner", "asc")
        .paging(0, 3)
    );

    expect(results).toHaveLength(3);
    expect((results[0] as any).owner).toBe("Brianna");

    await close();
  });
});

describe("fancy queries (with helpers)", () => {
  it("gets all the right stuff", async () => {
    const { add, query, close } = Store(":memory:");
    for (const puppy of puppies) {
      await add(puppy);
    }

    const results = await query((select) =>
      select
        .where(equals("breed", "Labrador"))
        .where(not(like("owner", "Ric%")))
        .orderBy("owner", "asc")
        .paging(0, 3)
    );

    expect(results).toHaveLength(3);
    expect((results[0] as any).owner).toBe("Brianna");

    await close();
  });
});

describe("any item in an array", () => {
  it("checks if the predicate matches any item", async () => {
    const { add, query, close } = Store(":memory:");
    await add({
      name: "Chicken soup",
      ingredients: ["Noodles", "Broth", "Chicken", "Vegetables"],
    });

    await add({
      name: "Pea soup",
      ingredients: ["Peas", "Salt"],
    });

    const result = await query((soup) =>
      soup
        .where(($, row) =>
          $.any($.get(row, "ingredients"), (ingredient) =>
            $.eq(ingredient, $.val("Chicken"))
          )
        )
        .where(($, row) => $.like($.get(row, "name"), "% soup"))
    );

    expect(result).toHaveLength(1);
    expect((result as any)[0].name).toBe("Chicken soup");

    await close();
  });
});

describe(`Nested any calls`, () => {
  it(`Fuck knows`, async () => {
    const { add, query, close } = Store(":memory:");
    await add({
      name: "Chicken soup",
      ingredients: [
        { name: "Noodles", alternatives: [] },
        { name: "Broth", alternatives: [] },
        { name: "Chicken", alternatives: ["Tofu"] },
        { name: "Vegetables", alternatives: ["meat"] },
      ],
    });

    await add({
      name: "Pea soup",
      ingredients: [
        { name: "Peas", alternatives: [] },
        { name: "Salt", alternatives: ["sugar"] },
      ],
    });

    const result = await query((soup) =>
      soup.where(($, row) =>
        $.any($.get(row, "ingredients"), (ingredient) =>
          $.any($.get(ingredient, "alternatives"), (alt) =>
            $.like(alt, "sugar")
          )
        )
      )
    );

    expect(result).toHaveLength(1);
    expect((result as any)[0].name).toBe("Pea soup");

    await close();
  });
});

describe("adding objects into the store", () => {
  it("returns an id for each object", async () => {
    const { add, close } = Store(":memory:");
    let idx = 0;
    for (const puppy of puppies) {
      const id = await add(puppy);
      expect(id).toBe(++idx);
    }

    await close();
  });
});

describe("putting objects back in to the store", () => {
  it("returns an id for each object", async () => {
    const { add, put, get, close } = Store(":memory:");
    const id = await add({ fart: "poop" });
    await put(id, { butts: "wees" });
    const record = await get(id);
    expect(record).toStrictEqual({ butts: "wees" });

    await close();
  });
});

describe("Getting objects out by Id", () => {
  it("gets the object back by the given Id", async () => {
    const { add: put, get, close } = Store(":memory:");
    for (const puppy of puppies) {
      await put(puppy);
    }

    expect(await get(7)).toStrictEqual(puppies[6]);

    await close();
  });
});

describe("find one matching object", () => {
  it("gets the object back by given criteria", async () => {
    const { add: put, findOneBy, close } = Store(":memory:");
    for (const puppy of puppies) {
      await put(puppy);
    }

    expect(await findOneBy("name", "Bella")).toStrictEqual({
      id: 6,
      ...puppies[5],
    });

    await close();
  });
});

describe("find all matching objects", () => {
  it(`gets all the objects matching the given criteria`, async () => {
    const { add: put, findBy, close } = Store(":memory:");
    for (const puppy of puppies) {
      await put(puppy);
    }
    const labs = await findBy("breed", "Labrador");

    expect(labs).toHaveLength(5);

    await close();
  });
});
