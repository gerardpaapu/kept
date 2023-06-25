import type { ILiteralAlg, ITestAlg, TPicker, TPredicate } from "./algebra";

export interface IBooleanW {
	and(b: IBooleanW): IBooleanW;
	or(b: IBooleanW): IBooleanW;
	not(): IBooleanW;
	unwrap(): TBool;
}

export interface IPickerW {
	id(): IPickerW;
	get(prop: string): IPickerW;
	unwrap(): TPickerInternal;
}

export interface IValueW {
	/**
	 * Get the row id of the current object
	 */
	id(): IValueW;
	/** get a property of this value */
	get(prop: string): IValueW;
	/** compare equality  */
	eq(_: string | number | IValueW): IBooleanW;
	gt(_: number | IValueW): IBooleanW;
	lt(_: number | IValueW): IBooleanW;
	like(_: string): IBooleanW;
	any(predicate: (value: IValueW) => IBooleanW): IBooleanW;
	unwrap(): TValueF;
	not: ICompW;
}

export interface ICompW {
	eq(_: string | number | IValueW): IBooleanW;
	gt(_: number | IValueW): IBooleanW;
	lt(_: number | IValueW): IBooleanW;
	like(_: string): IBooleanW;
	any(predicate: (value: IValueW) => IBooleanW): IBooleanW;
}

type TValueF = <T, B>($: ITestAlg<T, B>) => T;
type TBool = <T, B>($: ITestAlg<T, B>) => B;

const convertPredicate =
	(f: (_: IValueW) => IBooleanW) =>
	<T, B>(alg: ITestAlg<T, B>, value: T): B => {
		// I believe this cast is in principle safe
		return f(wrapValue(() => value as any)).unwrap()(alg);
	};

export const wrapValue = (m: TValueF): IValueW => ({
	id: () => wrapValue(($) => $.id()),
	get: (prop: string) => wrapValue(($) => $.get(m($), prop)),
	eq: (v: string | number | IValueW) =>
		wrapbool(($) =>
			$.eq(m($), typeof v === "object" ? v.unwrap()($) : $.val(v)),
		),
	gt: (v) =>
		wrapbool(($) =>
			$.gt(m($), typeof v === "object" ? v.unwrap()($) : $.val(v)),
		),
	lt: (v) =>
		wrapbool(($) =>
			$.lt(m($), typeof v === "object" ? v.unwrap()($) : $.val(v)),
		),
	any: (f) => wrapbool(($) => $.any(m($), (v) => convertPredicate(f)($, v))),
	like: (pattern: string) => wrapbool(($) => $.like(m($), pattern)),
	not: wrapComp(m),
	unwrap: () => m,
});

export const wrapComp = (m: TValueF): ICompW => ({
	eq: (v) =>
		wrapbool(($) =>
			$.not($.eq(m($), typeof v === "object" ? v.unwrap()($) : $.val(v))),
		),
	gt: (v) =>
		wrapbool(($) =>
			$.not($.gt(m($), typeof v === "object" ? v.unwrap()($) : $.val(v))),
		),
	lt: (v) =>
		wrapbool(($) =>
			$.not($.lt(m($), typeof v === "object" ? v.unwrap()($) : $.val(v))),
		),
	like: (pattern) => wrapbool(($) => $.not($.like(m($), pattern))),
	any: (f) =>
		wrapbool(($) => $.not($.any(m($), (v) => convertPredicate(f)($, v)))),
});

export const wrapbool = (m: TBool): IBooleanW => ({
	and: (a) => wrapbool(($) => $.and(m($), a.unwrap()($))),
	or: (a) => wrapbool(($) => $.or(m($), a.unwrap()($))),
	not: () => wrapbool(($) => $.not(m($))),
	unwrap: () => m,
});

export const wrapPicker = (m: TPickerInternal): IPickerW => ({
	id: () => wrapPicker(($) => $.id()),
	get: (prop: string) => wrapPicker(($) => $.get(m($), prop)),
	unwrap: () => m,
});

export type TPickerInternal = <V>(alg: ILiteralAlg<V>) => V;

export const unwrapPicker =
	(f: (_: IPickerW) => IPickerW): TPicker =>
	($, v) =>
		f(wrapPicker(() => v as any)).unwrap()($);

export const unwrapCondition = (c: ConditionW): TPredicate => ($, r) =>
  c(wrapValue(() => r as any)).unwrap()($)

export type ConditionW = (record: IValueW) => IBooleanW;
export type PickerW = (record: IPickerW) => IPickerW;