import { ConditionW, PickerW } from "./wrapper";

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
