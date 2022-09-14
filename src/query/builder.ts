import type { TPredicate, TPicker } from "./algebra";
export { default as compile } from "./compile-builder";

export interface Query {
  where: TPredicate[];
  orderBy: { prop: TPicker; order: "asc" | "desc" } | undefined;
  offset: number | undefined;
  limit: number | undefined;
}

export interface IBuilder {
  where(pred: TPredicate): IBuilder;
  and(pred: TPredicate): IBuilder;
  orderBy(prop: TPicker, order: "desc" | "asc"): IBuilder;
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
