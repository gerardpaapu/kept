import { TPredicate, TPicker } from "./algebra";
import { ConditionW, PickerW, unwrapCondition, unwrapPicker } from "./wrapper";

export interface Query {
	where: TPredicate[];
	orderBy: { prop: TPicker; order: "asc" | "desc" } | undefined;
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

export type Paramaterised<R extends {} = {}> = (
	b: IBuilder,
	params: R,
) => IBuilder;

export const builder = (query: Query): IBuilder => {
	return {
		query,
		where: (pred) =>
			builder({ ...query, where: [...query.where, unwrapCondition(pred)] }),
		and: (pred) =>
			builder({ ...query, where: [...query.where, unwrapCondition(pred)] }),
		orderBy: (prop, order) =>
			builder({ ...query, orderBy: { prop: unwrapPicker(prop), order } }),
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
