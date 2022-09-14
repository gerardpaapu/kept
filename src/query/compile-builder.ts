import compileCondition from "./compile-condition";
import compileValue from "./compile-value";
import type { IBuilder } from "./builder";

const compileBuilder = ({
  query,
}: IBuilder): [sql: string, ...args: (string | number)[]] => {
  const conditions = query.where.map(compileCondition);
  let sql = `SELECT id, json as json0 \nFROM objects\n`;
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
    const value = compileValue(query.orderBy.prop);

    sql += `ORDER BY ${value.sql} ${query.orderBy.order.toUpperCase()}\n`;
    params.push(...value.params);
  }

  const { skip, limit } = query;
  if (skip && limit) {
    sql += `LIMIT ? OFFSET ?`;
    params.push(limit, skip);
  } else if (skip) {
    sql += `OFFSET ?`;
    params.push(skip);
  } else if (limit) {
    sql += `LIMIT ?`;
    params.push(limit);
  }

  return [sql, ...params];
};

export default compileBuilder;
