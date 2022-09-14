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
