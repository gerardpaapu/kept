import { describe, it, expect } from "vitest";
import * as builder from "./builder";
import * as json from "./json";

describe("compiling to JSON ", () => {
	it("emits some valid JSON", () => {
		const doggos = builder
			.empty()
			.where((dog) =>
				dog
					.get("weight")
					.gt(dog.get("height"))
					.and(
						dog
							.get("friends")
							.any((friend) => friend.get("name").like("Frank")),
					),
			)
			.orderBy((dog) => dog.get("name"), "asc");
		expect(json.compile(doggos)).toMatchInlineSnapshot(`
      {
        "orderBy": {
          "order": "asc",
          "prop": [
            ".",
            [
              "this",
            ],
            "name",
          ],
        },
        "where": [
          [
            "and",
            [
              "gt",
              [
                ".",
                [
                  "this",
                ],
                "weight",
              ],
              [
                ".",
                [
                  "this",
                ],
                "height",
              ],
            ],
            [
              "any",
              [
                ".",
                [
                  "this",
                ],
                "friends",
              ],
              "_1",
              [
                "like",
                [
                  ".",
                  [
                    "var",
                    "_1",
                  ],
                  "name",
                ],
                "Frank",
              ],
            ],
          ],
        ],
      }
    `);
	});

	it("Round trips", () => {
		const doggos = builder
			.empty()
			.where((dog) =>
				dog
					.get("weight")
					.gt(dog.get("height"))
					.and(
						dog
							.get("friends")
							.any((friend) => friend.get("name").like("Frank")),
					),
			)
			.orderBy((dog) => dog.get("name"), "asc");

		const json1 = json.compile(doggos);
		const doggos1 = json.decompile(json1);
		const json2 = json.compile(doggos1);

		expect(json1).toEqual(json2);
	});
});
