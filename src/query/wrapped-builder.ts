import { Database } from "../db";
import { ConditionW, TPredicate, PickerW, wrapValue } from "./algebra";
export { default as compile } from "./compile-builder";

export interface Query {
  where: ConditionW[];
  orderBy: { prop: PickerW; order: "asc" | "desc" } | undefined;
  offset: number | undefined;
  limit: number | undefined;
}

export interface IBuilder {
  where(pred: ConditionW): IBuilder;
  and(pred: ConditionW): IBuilder;
  orderBy(prop: PickerW, order: "desc" | "asc"): IBuilder;
  offset(count: number): IBuilder;
  limit(count: number): IBuilder;
  query: Query;
}

export const builder = (query: Query): IBuilder => {
  return {
    query,
    where: (pred) => builder({ ...query, where: [...query.where, pred] }),
    and: (pred) => builder({ ...query, where: [...query.where, pred] }),
    orderBy: (prop, order) => builder({ ...query, orderBy: { prop, order } }),
    offset: (count) => builder({ ...query, offset: count }),
    limit: (count) => builder({ ...query, limit: count }),
  };
};

export const empty = () =>
  builder({
    where: [],
    orderBy: undefined,
    offset: undefined,
    limit: undefined,
  });

import compileCondition from "./compile-condition";
import compileValue from "./compile-value";

const compileBuilder = ({
  query,
}: IBuilder): [sql: string, ...args: (string | number)[]] => {
  const conditions = query.where.map((w) => {
    const p: TPredicate = ($, v) => w(wrapValue(() => v as any)).unwrap()($);
    return compileCondition(p);
  });
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
    const { prop } = query.orderBy;
    const value = compileValue(($, record) => {
      return prop(wrapValue(() => record as any)).unwrap()($ as any);
    });

    sql += `ORDER BY ${value.sql} ${query.orderBy.order.toUpperCase()}\n`;
    params.push(...value.params);
  }

  const { offset, limit } = query;
  if (offset && limit) {
    sql += `LIMIT ? OFFSET ?`;
    params.push(limit, offset);
  } else if (offset) {
    sql += `OFFSET ?`;
    params.push(offset);
  } else if (limit) {
    sql += `LIMIT ?`;
    params.push(limit);
  }

  return [sql, ...params];
};

export default compileBuilder;

interface IRow {
  id: number;
  json0: string;
}

export const wrappedQueryRaw = async (
  db: Database,
  build: (_: IBuilder) => IBuilder
) => {
  const args = compileBuilder(build(empty()));
  const rows = await db.all(...args);
  // TODO: this cast is not ideal
  return (rows as unknown as IRow[]).map(({ id, json0: json }) => ({
    id,
    ...JSON.parse(json),
  }));
};
