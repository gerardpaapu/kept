import type { TInterpreter, TPredicate } from "../../query/algebra";

type DepthString = (depth: number) => string;

interface IPGValue {
  asUnknown(depth: number): string;
  asJson(depth: number): string;
}

const asSql =
  (start: number): TInterpreter<DepthString> =>
  (query) => {
    let id = start;
    return query<DepthString, IPGValue>(
      {
        eq: (a, b) => (n) => `${a.asUnknown(n)} = ${b.asUnknown(n)}`,
        gt: (a, b) => (n) => `${a.asUnknown(n)} > ${b.asUnknown(n)}`,
        lt: (a, b) => (n) => `${a.asUnknown(n)} < ${b.asUnknown(n)}`,
        like: (a) => (n) => `${a.asUnknown(n)} LIKE $${id++}`,
        not: (a) => (n) => `NOT (${a(n)})`,
        and: (a, b) => (n) => `(${a(n)} AND ${b(n)})`,
        or: (a, b) => (n) => `(${a(n)} OR ${b(n)})`,
        val: () => ({
          asUnknown: () => `$${id++}`,
          asJson: () => `$${id++}`,
        }),
        get: (v) => ({
          asUnknown: (n) => `${v.asJson(n)}->>$${id++}`,
          asJson: (n) => `${v.asJson(n)}->$${id++}`,
        }),
        id: () => ({
          asUnknown: () => `id`,
          asJson: () => {
            throw new Error(`id has no JSON representation`);
          }, // THIS SHOULD PROBABLY THROW
        }),
        any: (a, f) => (depth: number) => {
          const j = `j${depth}`;
          return `EXISTS (SELECT ${j}.value as ${j} 
                        FROM json_array_elements(${a.asJson(depth)}) as ${j}
                        WHERE ${f({
                          asJson: () => j,
                          asUnknown: () => `${j} #>> '{}'`,
                        })(depth + 1)})`;
        },
      },
      {
        asJson: () => "json",
        asUnknown: () => {
          throw new Error(`column json has no non-JSON representation`);
        },
      }
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
      val: (a) => [a],
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
