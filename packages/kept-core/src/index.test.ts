import { describe, expect, it } from "vitest";
import * as builder from "./builder";
import { TInterpreter } from "./algebra";

const t: TInterpreter<string> = (p) =>
	p(
		{
			eq: (a, b) => `${a} = ${b}`,
			gt: (a, b) => `${a} > ${b}`,
			lt: (a, b) => `${a} < ${b}`,
			like: (a, b) => `like(${a}, ${b})`,
			any: (a, b) => `any(${a},${b("o")} )`,
			val: (s) => String(s),
			get: (o, k) => `${o}.${k}`,
			id: () => "id",
			and: (a, b) => `${a} && ${b}`,
			or: (a, b) => `${a} || ${b}`,
			not: (a) => `(!${a})`,
		},
		"i",
	);

describe("Basic builder check", () => {
	it("builds a query", () => {
		const { query } = builder
			.empty()
			.where((dog) => dog.get("name").like("Fido%"))
			.and((dog) => dog.get("weight").lt(10));

		expect(query.where.map(t)).toMatchInlineSnapshot(`
      [
        "like(i.name, Fido%)",
        "i.weight < 10",
      ]
    `);
	});
});
