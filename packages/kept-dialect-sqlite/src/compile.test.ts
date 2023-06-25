import { describe, it, expect } from "vitest";
import compile from "./index";
import * as builder from "@donothing/kept-core/dist/builder";

describe("Compiling to SQLite dialect", () => {
	it("compiles what you would expect", () => {
		const query = builder
			.empty()
			.where((dog) => dog.get("name").like("Fido%"))
			.and((dog) => dog.get("weight").lt(10))
			.offset(20)
			.limit(10)
			.orderBy((dog) => dog.id(), "desc");

		expect(compile(query)).toMatchInlineSnapshot(`
      [
        "SELECT id, json as json0 
      FROM objects
      WHERE json_extract(json0, ?) LIKE ?
      AND json_extract(json0, ?) < ?
      ORDER BY objects.id DESC
      LIMIT ? OFFSET ?",
        "$.name",
        "Fido%",
        "$.weight",
        10,
        10,
        20,
      ]
    `);
	});
});
