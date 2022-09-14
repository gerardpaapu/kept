import type { TPredicate, TPicker } from "./algebra";

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
