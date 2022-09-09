import type sqlite3 from "sqlite3";

interface IRow {
  id: number;
  json: string;
  count?: number;
}

interface Query {
  where: TPredicate[];
  orderBy: { prop: string; order: "asc" | "desc" } | undefined;
  paging: { skip: number; limit: number } | undefined;
}

export interface Builder {
  where(pred: TPredicate): Builder;
  and(pred: TPredicate): Builder;
  orderBy(prop: string, order: "desc" | "asc"): Builder;
  paging(skip: number, limit: number): Builder;
  query: Query;
}

const builder = (query: Query): Builder => {
  return {
    query,
    where: (pred) => builder({ ...query, where: [...query.where, pred] }),
    and: (pred) => builder({ ...query, where: [...query.where, pred] }),
    orderBy: (prop, order) => builder({ ...query, orderBy: { prop, order } }),
    paging: (skip, limit) => builder({ ...query, paging: { skip, limit } }),
  };
};

const empty = () =>
  builder({ where: [], orderBy: undefined, paging: undefined });

interface IBooleanAlg<V, T> {
  eq(a: V, b: V): T;
  gt(a: V, b: V): T;
  lt(a: V, b: V): T;
  any(a: V, f: (value: V) => T): T;
  like(a: V, pattern: string): T;
  not(expr: T): T;
}

interface ILiteralAlg<T> {
  str(s: string): T;
  num(n: number): T;
}

interface ITestAlg<V, T> extends ILiteralAlg<V>, IBooleanAlg<V, T> {}

type TPropsAlg<T> = {
  [_ in string]: T;
};

type TPredicate = <T, V>(alg: ITestAlg<V, T>, col: TPropsAlg<V>) => T;

type TInterpreter<T> = (p: TPredicate) => T;

const asSqlProxy = new Proxy(
  {},
  {
    get() {
      return `json_extract(json, ?)`;
    },
  }
) as { [_ in string]: string };

const asSql: TInterpreter<string> = (alg) =>
  alg(
    {
      eq: (a, b) => `${a} = ${b}`,
      gt: (a, b) => `${a} > ${b}`,
      lt: (a, b) => `${a} < ${b}`,
      like: (a) => `${a} LIKE ?`,
      not: (a) => `NOT (${a})`,
      str: () => `?`,
      num: () => `?`,
      any: (_a, f) =>
        `EXISTS (SELECT * FROM objects butt, json_each(objects.json, ?)
        WHERE ${f("json_each.value")} 
        AND butt.id = objects.id)`,
    },
    asSqlProxy
  );

const asParamsProxy = new Proxy(
  {},
  {
    get(_, p: string | symbol) {
      if (typeof p === "string") {
        return [`$.${p}`];
      } else {
        return [`$.${p.description || p.toString()}`];
      }
    },
  }
) as { [_ in string]: (string | number)[] };

const asParams: TInterpreter<(string | number)[]> = (alg) =>
  alg(
    {
      eq: (a, b) => [...a, ...b],
      gt: (a, b) => [...a, ...b],
      lt: (a, b) => [...a, ...b],
      like: (a, b) => [...a, b],
      not: (a) => a,
      str: (a) => [a],
      num: (a) => [a],
      any: (a, f) => f(a),
    },
    asParamsProxy
  );

const compile = ({ query }: Builder) => {
  const lines = query.where.map(asSql);
  const params = query.where.flatMap(asParams);
  let sql = "SELECT id, json FROM objects\n";
  if (lines.length > 0) {
    const [first, ...rest] = lines;
    sql += `WHERE ${first}\n`;
    sql += rest.map((line) => `AND ${line}\n`);
  }

  if (query.orderBy) {
    sql += `ORDER BY json_extract(json, ?) ${query.orderBy.order.toUpperCase()}\n`;
    params.push(`$.${query.orderBy.prop}`);
  }

  if (query.paging) {
    const { skip, limit } = query.paging;
    sql += `LIMIT ? OFFSET ?`;
    params.push(limit, skip);
  }
  return [sql, ...params];
};

export const queryRaw = (db: sqlite3.Database, f: (_: Builder) => Builder) =>
  new Promise<any[]>((resolve, reject) => {
    const args = compile(f(empty())) as [string, ...string[]];
    console.log(args);
    db.all(...args, (err: Error | undefined, rows: IRow[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          rows.map(({ id, json, count }) => ({
            id,
            count,
            ...JSON.parse(json),
          }))
        );
      }
    });
  });

export const greaterThan =
  (field: string, value: number): TPredicate =>
  ($, row) =>
    $.gt(row[field], $.num(value));

export const lessThan =
  (field: string, value: number): TPredicate =>
  ($, row) =>
    $.lt(row[field], $.num(value));

export const numberEquals =
  (field: string, value: number): TPredicate =>
  ($, row) =>
    $.eq(row[field], $.num(value));

export const stringEquals =
  (field: string, value: string): TPredicate =>
  ($, row) =>
    $.eq(row[field], $.str(value));

export const like =
  (field: string, pattern: string): TPredicate =>
  ($, row) =>
    $.like(row[field], pattern);

export const not =
  (pred: TPredicate): TPredicate =>
  ($, col) =>
    $.not(pred($, col));
