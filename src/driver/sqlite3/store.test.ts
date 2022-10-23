import { Store } from "./store";
import * as OS from "node:os";
import * as FS from "node:fs/promises";
import * as Path from "node:path";

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
        .where((pup) => pup.get("breed").eq("Labrador"))
        .where((pup) => pup.get("owner").not.like("Ric%"))
        .orderBy((pup) => pup.get("owner"), "asc")
        .limit(3)
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

    const result = await query((recipes) =>
      recipes
        .where((recipe) =>
          recipe.get("ingredients").any((ig) => ig.eq("Chicken"))
        )
        .where((recipe) => recipe.get("name").like("% soup"))
    );

    expect(result).toHaveLength(1);
    expect((result as any)[0].name).toBe("Chicken soup");

    await close();
  });
});

describe(`Nested any calls (wrapped)`, () => {
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
      soup.where((recipe) =>
        recipe
          .get("ingredients")
          .any((ingredient) =>
            ingredient.get("alternatives").any((alt) => alt.like("sugar"))
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

describe("adding many objects into the store", () => {
  it("returns an id for each object", async () => {
    const { addAll, all, close } = Store(":memory:");
    await addAll(puppies);
    const records = await all();
    expect(records).toHaveLength(puppies.length);
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
    const { add, findBy, close } = Store(":memory:");
    for (const puppy of puppies) {
      await add(puppy);
    }
    const labs = await findBy("breed", "Labrador");

    expect(labs).toHaveLength(5);

    await close();
  });
});

describe("atomic update", () => {
  it(`preserves all writes`, async () => {
    const tempdir = await FS.mkdtemp(Path.join(OS.tmpdir(), "kept-"));
    const path = Path.join(tempdir, "data.db");
    const { add, update, get, close } = Store(path);

    const id = await add({ a: 0, b: 0, c: 0 });
    await Promise.all([
      update<Record<string, number>>(id, (prev) => ({
        ...prev,
        a: prev.a + 1,
      })),
      update<Record<string, number>>(id, (prev) => ({
        ...prev,
        b: prev.b + 1,
      })),
      update<Record<string, number>>(id, (prev) => ({
        ...prev,
        c: prev.c + 1,
      })),
      update<Record<string, number>>(id, (prev) => ({
        ...prev,
        a: prev.a + 1,
      })),
      update<Record<string, number>>(id, (prev) => ({
        ...prev,
        b: prev.b + 1,
      })),
      update<Record<string, number>>(id, (prev) => ({
        ...prev,
        c: prev.c + 1,
      })),
    ]);

    const result = await get(id);
    expect(result).toStrictEqual({
      a: 2,
      b: 2,
      c: 2,
    });

    await close();
  });

  it(`yields the updated value`, async () => {
    const tempdir = await FS.mkdtemp(Path.join(OS.tmpdir(), "kept-"));
    const path = Path.join(tempdir, "data.db");
    const { add, update, close } = Store(path);

    const id = await add(23);
    const result = await update(id, (n: number) => n * n);
    expect(result).toBe(23 * 23);

    await close();
  });
});
