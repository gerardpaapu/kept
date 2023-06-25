import * as builder from "./builder";
import type { IBuilder } from "./builder";
import { TPicker, TPredicate } from "./algebra";
import { wrapPicker, wrapbool } from "./wrapper";

interface Ast {
	where: ConditionAst[];
	orderBy?: { prop: ValueAst; order: "asc" | "desc" };
	limit: number;
	offset: number;
}

type ConditionAst =
	| ["eq" | "gt" | "lt", ValueAst, ValueAst]
	| ["like", ValueAst, string]
	| ["any", ValueAst, string, ConditionAst]
	| ["and", ConditionAst, ConditionAst]
	| ["or", ConditionAst, ConditionAst]
	| ["not", ConditionAst];

type ValueAst =
	| ["this"]
	| ["lit", number | string]
	| [".", ValueAst, string]
	| ["id"]
	| ["var", string];

function compileCondition(predicate: TPredicate): ConditionAst {
	let i = 0;
	return predicate<ConditionAst, ValueAst>(
		{
			eq(a, b) {
				return ["eq", a, b];
			},
			gt(a, b) {
				return ["gt", a, b];
			},
			lt(a, b) {
				return ["lt", a, b];
			},
			like(a, pattern) {
				return ["like", a, pattern];
			},
			any(a, predicate) {
				const k = `_${++i}`;
				return ["any", a, k, predicate(["var", k])];
			},
			val(s: string | number) {
				return ["lit", s];
			},
			get(obj, prop) {
				return [".", obj, prop];
			},
			id() {
				return ["id"];
			},
			and(left, right) {
				return ["and", left, right];
			},
			or(left, right) {
				return ["or", left, right];
			},
			not(expr) {
				return ["not", expr];
			},
		},
		["this"],
	);
}

function compileValue(picker: TPicker): ValueAst {
	return picker<ValueAst>(
		{
			val(s: string | number) {
				return ["lit", s];
			},
			get(obj, prop) {
				return [".", obj, prop];
			},
			id() {
				return ["id"];
			},
		},
		["this"] as ValueAst,
	);
}

export const compile = ({ query }: IBuilder): Ast => {
	const result = {} as Ast;
	result.where = query.where.map(compileCondition);

	const { orderBy, limit, offset } = query;
	if (orderBy) {
		const prop = compileValue(orderBy.prop);
		const order = orderBy.order;
		result.orderBy = { prop, order };
	}

	if (offset) {
		result.offset = offset;
	}

	if (limit) {
		result.limit = limit;
	}

	return result;
};

function decompilePicker(
	ast: ValueAst,
	env: Record<string, TPicker | undefined>,
): TPicker {
	switch (ast[0]) {
		case ".":
			return ($, rec) => $.get(decompilePicker(ast[1], env)($, rec), ast[2]);
		case "id":
			return ($) => $.id();
		case "this":
			return (_, rec) => rec;
		case "lit":
			return ($) => $.val(ast[1]);
		case "var":
			return ($, r) => {
				const value = env[ast[1]];
				if (!value) {
					throw new Error(`${ast[1]} is undefined`);
				}

				return value($, r);
			};
	}
}

function decompileCondition(
	v: ConditionAst,
	env: Record<string, TPicker | undefined>,
): TPredicate {
	switch (v[0]) {
		case "eq":
			return ($, record) => {
				const l = decompilePicker(v[1], env);
				const r = decompilePicker(v[2], env);
				return $.eq(l($, record), r($, record));
			};

		case "gt":
			return ($, record) => {
				const l = decompilePicker(v[1], env);
				const r = decompilePicker(v[2], env);
				return $.gt(l($, record), r($, record));
			};

		case "lt":
			return ($, record) => {
				const l = decompilePicker(v[1], env);
				const r = decompilePicker(v[2], env);
				return $.lt(l($, record), r($, record));
			};

		case "like":
			return ($, record) => {
				const l = decompilePicker(v[1], env);
				return $.like(l($, record), v[2]);
			};

		case "any":
			return ($, record) => {
				const [arr, k, f] = [v[1], v[2], v[3]];
				const arr_ = decompilePicker(arr, env);
				return $.any(arr_($, record), (v) => {
					// ... I think this is principiled
					const vv: TPicker = () => v as any;
					const env_ = { ...env, [k]: vv };
					return decompileCondition(f, env_)($, v);
				});
			};

		case "and":
			return ($, record) => {
				const l = decompileCondition(v[1], env);
				const r = decompileCondition(v[2], env);
				return $.and(l($, record), r($, record));
			};

		case "or":
			return ($, record) => {
				const l = decompileCondition(v[1], env);
				const r = decompileCondition(v[2], env);
				return $.or(l($, record), r($, record));
			};

		case "not":
			return ($, record) => {
				const l = decompileCondition(v[1], env);
				return $.not(l($, record));
			};
	}
}

export const decompile = (ast: Ast): IBuilder => {
	let result = builder.empty();
	if (ast.limit) {
		result = result.limit(ast.limit);
	}

	if (ast.offset) {
		result = result.offset(ast.offset);
	}

	const orderBy = ast.orderBy;
	if (orderBy) {
		const prop = orderBy.prop;
		// TODO: seems like wrapper should provide something here
		result = result.orderBy((record) => {
			return wrapPicker(($) => {
				const r = record.unwrap()($);
				const f = decompilePicker(prop, {});
				return f($, r);
			});
		}, orderBy.order);
	}

	for (const condition of ast.where) {
		const cc = decompileCondition(condition, {});
		result = result.where((val) => wrapbool(($) => cc($, val.unwrap()($))));
	}

	return result;
};
