import compileCondition from "./compile-condition";
import compileValue from "./compile-value";
import type { IBuilder } from "../../query/builder";
import { TPredicate } from "../../query/algebra";
import { convertPicker, wrapValue } from "../../query/wrapper";

const compileBuilder = ({
	query,
}: IBuilder): [sql: string, ...args: (string | number)[]] => {
	let start = 1;
	const conditions = query.where.map((w) => {
		const p: TPredicate = ($, v) => w(wrapValue(() => v as any)).unwrap()($);
		const result = compileCondition(p, start);
		start += result.params.length;
		return result;
	});
	let sql = "SELECT id, json \nFROM objects\n";
	const params = [] as (string | number)[];

	if (conditions.length > 0) {
		const [first, ...rest] = conditions;
		sql += `WHERE ${first.sql(1)}\n`;
		params.push(...first.params);

		for (const condition of rest) {
			sql += `AND ${condition.sql(1)}\n`;
			params.push(...condition.params);
		}
	}

	if (query.orderBy) {
		const { prop } = query.orderBy;
		const value = compileValue(convertPicker(prop), params.length + 1);

		sql += `ORDER BY ${value.sql} ${query.orderBy.order.toUpperCase()}\n`;
		params.push(...value.params);
	}

	const { offset, limit } = query;
	if (offset && limit) {
		sql += `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
		params.push(limit, offset);
	} else if (offset) {
		sql += `OFFSET $${params.length + 1}`;
		params.push(offset);
	} else if (limit) {
		sql += `LIMIT $${params.length + 1}`;
		params.push(limit);
	}

	return [sql, ...params];
};

export default compileBuilder;
