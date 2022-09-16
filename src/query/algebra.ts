export interface IComparisonAlg<TValue, TBoolean> {
  eq(a: TValue, b: TValue): TBoolean;
  gt(a: TValue, b: TValue): TBoolean;
  lt(a: TValue, b: TValue): TBoolean;
  like(a: TValue, pattern: string): TBoolean;
  any(a: TValue, predicate: (item: TValue) => TBoolean): TBoolean;
}

export interface IBooleanAlg<T> {
  and(left: T, right: T): T;
  or(left: T, right: T): T;
  not(expr: T): T;
}

export interface IBooleanW {
  and(b: IBooleanW): IBooleanW;
  or(b: IBooleanW): IBooleanW;
  not(): IBooleanW;
  unwrap(): TBool;
}

export interface IValueW {
  id(): IValueW;
  get(prop: string): IValueW;
  eq(_: string | number): IBooleanW;
  eq_(_: IValueW): IBooleanW;
  gt(_: number): IBooleanW;
  gt_(_: IValueW): IBooleanW;
  lt(_: number): IBooleanW;
  lt_(_: IValueW): IBooleanW;
  like(_: string): IBooleanW;
  any(predicate: (value: IValueW) => IBooleanW): IBooleanW;
  unwrap(): TValueF;
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
  eq: (v: string | number) => wrapbool(($) => $.eq(m($), $.val(v))),
  eq_: (v) => wrapbool(($) => $.eq(m($), v.unwrap()($))),
  gt: (v: number) => wrapbool(($) => $.gt(m($), $.val(v))),
  gt_: (v) => wrapbool(($) => $.gt(m($), v.unwrap()($))),
  lt: (v) => wrapbool(($) => $.lt(m($), $.val(v))),
  lt_: (v) => wrapbool(($) => $.lt(m($), v.unwrap()($))),
  any: (f) => wrapbool(($) => $.any(m($), (v) => convertPredicate(f)($, v))),
  like: (pattern: string) => wrapbool(($) => $.like(m($), pattern)),
  unwrap: () => m,
});

export const wrapbool = (m: TBool): IBooleanW => ({
  and: (a) => wrapbool(($) => $.and(m($), a.unwrap()($))),
  or: (a) => wrapbool(($) => $.or(m($), a.unwrap()($))),
  not: () => wrapbool(($) => $.not(m($))),
  unwrap: () => m,
});

export type ConditionW = (record: IValueW) => IBooleanW;
export type PickerW = (record: IValueW) => IValueW;
// const example: ConditionW = (puppy) =>
//   puppy
//     .get("poops")
//     .any(($, v) => $.eq(v, $.val("poop")))
//     .or(puppy.get("breed").like("%hound"))
//     .and(puppy.get("weight").gt(23));

export interface ILiteralAlg<TValue> {
  val(s: string | number): TValue;
  get(obj: TValue, prop: string): TValue;
  id(): TValue;
}

export interface ITestAlg<TValue, TBoolean>
  extends IComparisonAlg<TValue, TBoolean>,
    ILiteralAlg<TValue>,
    IBooleanAlg<TBoolean> {}

export type TPredicate = <T, V>(alg: ITestAlg<V, T>, record: V) => T;
export type TPicker = <V>(alg: ILiteralAlg<V>, record: V) => V;

export type TInterpreter<T> = (p: TPredicate) => T;
export type TValueInterpreter<T> = (p: TPicker) => T;
