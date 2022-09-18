import type { TInterpreter, TPredicate } from "../../query/algebra";

type DepthString = (depth: number) => string;

const asSql =
  (start: number): TInterpreter<DepthString> =>
  (query) => {
    let id = start;
    return query<DepthString, DepthString>(
      {
        eq: (a, b) => (n) => `${a(n)} = ${b(n)}`,
        gt: (a, b) => (n) => `${a(n)} > ${b(n)}`,
        lt: (a, b) => (n) => `${a(n)} < ${b(n)}`,
        like: (a) => (n) => `${a(n)} LIKE $${id++}`,
        not: (a) => (n) => `NOT (${a(n)})`,
        and: (a, b) => (n) => `(${a(n)} AND ${b(n)})`,
        or: (a, b) => (n) => `(${a(n)} OR ${b(n)})`,
        val: () => () => `$${id++}`,
        get: (v) => (n) => `${v(n)}->$${id++}`,
        id: () => () => `id`,
        any: (a, f) => (depth: number) => {
          const j = `j${depth}`;
          return `EXISTS (SELECT ${j}.value as ${j} 
                        FROM json_array_elements(${a(depth)}) as ${j}
                        WHERE ${f(() => j)(depth + 1)})`;
        },
      },
      () => "json"
    );
  };

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
      val: (a) => [JSON.stringify(a)],
      any: (a, f) => [...a, ...f([])],
      get: (a, p) => [...a, `${p}`],
      id: () => [],
    },
    [] as (string | number)[]
  );

const compile = (src: TPredicate, start: number) => ({
  sql: asSql(start)(src),
  params: asParams(src),
});

export default compile;
