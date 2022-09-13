import type sqlite3 from "sqlite3";

interface IRow {
  id: number;
  json0: string;
}

interface Query {
  where: TPredicate[];
  orderBy: { prop: TPicker; order: "asc" | "desc" } | undefined;
  skip: number | undefined;
  limit: number | undefined;
}

export interface Builder {
  where(pred: TPredicate): Builder;
  and(pred: TPredicate): Builder;
  orderBy(prop: TPicker, order: "desc" | "asc"): Builder;
  skip(count: number): Builder;
  limit(count: number): Builder;
  query: Query;
}

const builder = (query: Query): Builder => {
  return {
    query,
    where: (pred) => builder({ ...query, where: [...query.where, pred] }),
    and: (pred) => builder({ ...query, where: [...query.where, pred] }),
    orderBy: (prop, order) => builder({ ...query, orderBy: { prop, order } }),
    skip: (count) => builder({ ...query, skip: count }),
    limit: (count) => builder({ ...query, limit: count }),
  };
};

const empty = () =>
  builder({ where: [], orderBy: undefined, skip: undefined, limit: undefined });

interface IComparisonAlg<TValue, TBoolean> {
  eq(a: TValue, b: TValue): TBoolean;
  gt(a: TValue, b: TValue): TBoolean;
  lt(a: TValue, b: TValue): TBoolean;
  like(a: TValue, pattern: string): TBoolean;
  any(a: TValue, predicate: (item: TValue) => TBoolean): TBoolean;
}

interface IBooleanAlg<T> {
  and(left: T, right: T): T;
  or(left: T, right: T): T;
  not(expr: T): T;
}

interface ILiteralAlg<TValue> {
  val(s: string | number): TValue;
  get(obj: TValue, prop: string): TValue;
  id(): TValue;
}

interface ITestAlg<TValue, TBoolean>
  extends IComparisonAlg<TValue, TBoolean>,
    ILiteralAlg<TValue>,
    IBooleanAlg<TBoolean> {}

type TPredicate = <T, V>(alg: ITestAlg<V, T>, record: V) => T;
type TPicker = <V>(alg: ILiteralAlg<V>, record: V) => V;
type TInterpreter<T> = (p: TPredicate) => T;
type TValueInterpreter<T> = (p: TPicker) => T;

const getSqlValue: TValueInterpreter<string> = (scr) =>
  scr(
    {
      get: (obj) => `json_extract(${obj}, ?)`,
      val: () => `?`,
      id: () => "objects.id",
    },
    "json0"
  );

const getParamsValue: TValueInterpreter<(string | number)[]> = (scr) =>
  scr(
    {
      get: (obj, value) => [`$.${value}`],
      val: (s) => [s],
      id: () => [],
    },
    [] as (number | string)[]
  );

const asSql: TInterpreter<(depth: number) => string> = (query) =>
  query(
    {
      eq: (a, b) => (n) => `${a(n)} = ${b(n)}`,
      gt: (a, b) => (n) => `${a(n)} > ${b(n)}`,
      lt: (a, b) => (n) => `${a(n)} < ${b(n)}`,
      like: (a) => (n) => `${a(n)} LIKE ?`,
      not: (a) => (n) => `NOT (${a(n)})`,
      and: (a, b) => (n) => `(${a(n)} AND ${b(n)})`,
      or: (a, b) => (n) => `(${a(n)} OR ${b(n)})`,
      val: () => () => `?`,
      get: (v) => (n) => `json_extract(${v(n)}, ?)`,
      id: () => () => `id`,
      any: (a, f) => (depth: number) => {
        const j = `j${depth}`;
        return `EXISTS (SELECT ${j}.value as ${j} 
                        FROM json_each(${a(depth)}, '$') as ${j}
                        WHERE ${f(() => j)(depth + 1)})`;
      },
    } as ITestAlg<(_: number) => string, (_: number) => string>,
    () => "json0"
  );

const asParams: TInterpreter<(string | number)[]> = (query) =>
  query(
    {
      eq: (a, b) => [...a, ...b],
      gt: (a, b) => [...a, ...b],
      lt: (a, b) => [...a, ...b],
      like: (a, b) => [...a, b],
      not: (a) => a,
      and: (a, b) => [...a, ...b],
      or: (a, b) => [...a, ...b],
      val: (a) => [a],
      any: (a, f) => [...a, ...f([])],
      get: (a, p) => [...a, `$.${p}`],
      id: () => [],
    },
    [] as (string | number)[]
  );

// can we achieve something like this?
// where((obj) =>
//   obj
//     .prop("breed")
//     .like("Labrador") // I don't really like how this is laid out
//     .like('breed', 'labrador') // ? is this better
//     .and(obj.prop("friends").any((friend) => friend.like("James")))
// );

const compile = ({ query }: Builder) => {
  const lines = query.where.map(asSql);
  const params = query.where.flatMap(asParams);
  let sql = `SELECT id, json as json0 \nFROM objects\n`;
  if (lines.length > 0) {
    const [first, ...rest] = lines;
    sql += `WHERE ${first(1)}\n`;
    sql += rest.map((line) => `AND ${line(1)}\n`);
  }

  if (query.orderBy) {
    const _sql = getSqlValue(query.orderBy.prop);
    const _params = getParamsValue(query.orderBy.prop);
    sql += `ORDER BY ${_sql} ${query.orderBy.order.toUpperCase()}\n`;
    params.push(..._params);
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

export const queryRaw = (db: sqlite3.Database, f: (_: Builder) => Builder) =>
  new Promise<unknown[]>((resolve, reject) => {
    const args = compile(f(empty())) as [string, ...string[]];
    db.all(...args, (err: Error | undefined, rows: IRow[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          rows.map(({ id, json0: json }) => ({
            id,
            ...JSON.parse(json),
          }))
        );
      }
    });
  });

export const greaterThan =
  (field: string, value: number): TPredicate =>
  ($, row) =>
    $.gt($.get(row, field), $.val(value));

export const lessThan =
  (field: string, value: number): TPredicate =>
  ($, row) =>
    $.lt($.get(row, field), $.val(value));

export const equals =
  (field: string, value: number | string): TPredicate =>
  ($, row) =>
    $.eq($.get(row, field), $.val(value));

export const like =
  (field: string, pattern: string): TPredicate =>
  ($, row) =>
    $.like($.get(row, field), pattern);

export const not =
  (pred: TPredicate): TPredicate =>
  ($, row) =>
    $.not(pred($, row));

export const any =
  (prop: string, pred: TPredicate): TPredicate =>
  ($, row) =>
    $.any($.get(row, prop), (v) => pred($, v));

export const prop =
  (key: string): TPicker =>
  ($, row) =>
    $.get(row, key);
