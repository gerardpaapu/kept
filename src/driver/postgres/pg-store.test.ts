import { Store } from "./store";
import { Client } from "pg";

const TEST_DB = process.env.POSTGRESQL_CONNECTION_STRING;
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

if (TEST_DB != null) {
  beforeEach(async () => {
    const client = new Client({ connectionString: TEST_DB });
    client.connect();
    await client.query("DROP TABLE IF EXISTS objects");
    await client.end();
  });
  describe("fancy queries", () => {
    it("gets all the right stuff", async () => {
      const { add, query, close } = Store(TEST_DB);
      debugger;
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
      const { add, query, close } = Store(TEST_DB);
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
      const { add, query, close } = Store(TEST_DB);
      try {
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
      } finally {
        await close();
      }
    });
  });

  describe("adding objects into the store", () => {
    it("returns an id for each object", async () => {
      const { add, close } = Store(TEST_DB);
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
      const { add, put, get, close } = Store(TEST_DB);
      const id = await add({ fart: "poop" });
      await put(id, { butts: "wees" });
      const record = await get(id);
      expect(record).toStrictEqual({ butts: "wees" });

      await close();
    });
  });

  describe("Getting objects out by Id", () => {
    it("gets the object back by the given Id", async () => {
      const { add: put, get, close } = Store(TEST_DB);
      try {
        for (const puppy of puppies) {
          await put(puppy);
        }

        expect(await get(7)).toStrictEqual(puppies[6]);
      } finally {
        await close();
      }
    });
  });

  describe("find one matching object", () => {
    it("gets the object back by given criteria", async () => {
      const { add: put, findOneBy, close } = Store(TEST_DB);
      try {
        for (const puppy of puppies) {
          await put(puppy);
        }

        expect(await findOneBy("name", "Bella")).toStrictEqual({
          id: 6,
          ...puppies[5],
        });
      } finally {
        await close();
      }
    });
  });

  describe("find all matching objects", () => {
    it(`gets all the objects matching the given criteria`, async () => {
      const { add, findBy, close } = Store(TEST_DB);
      try {
        for (const puppy of puppies) {
          await add(puppy);
        }
        const labs = await findBy("breed", "Labrador");

        expect(labs).toHaveLength(5);
      } finally {
        await close();
      }
    });
  });

  describe("Concurrent update", () => {
    it(`preserves all writes`, async () => {
      const { add, update, get, close } = Store(TEST_DB);

      try {
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
      } finally {
        await close();
      }
    });
  });
} else {
  describe(`POSTGRESQL_CONNECTION_STRING is undefined`, () => {
    it("define the environment variable to run pg tests", () => {
      expect(true).toBeTruthy();
    });
  });
}
