import sqlite3 from "sqlite3";

export interface IRow {
  id: string;
  json: string;
}

export type IRunResult = { lastID: number; changes: unknown };

export interface Database {
  get(sql: string, ...params: (number | string)[]): Promise<IRow>;
  all(sql: string, ...params: (number | string)[]): Promise<IRow[]>;
  run(sql: string, ...params: (number | string)[]): Promise<IRunResult>;
  close(): Promise<void>;
  unwrap(): sqlite3.Database;
}

const wrap = (db: sqlite3.Database): Database => ({
  unwrap: () => db,

  get: (sql, ...params) =>
    new Promise((resolve, reject) => {
      db.get(sql, ...params, (error: Error, value: IRow) => {
        if (error != null) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    }),

  all: (sql, ...params) =>
    new Promise((resolve, reject) => {
      db.all(sql, ...params, (error: Error, values: IRow[]) => {
        if (error != null) {
          reject(error);
        } else {
          resolve(values);
        }
      });
    }),

  run: (sql, ...params) =>
    new Promise((resolve, reject) => {
      db.run(
        sql,
        ...params,
        function (
          this: { lastID?: number | string; changes?: unknown },
          error: Error
        ) {
          if (error != null) {
            reject(error);
          } else {
            const { lastID, changes } = this;
            resolve({ lastID, changes } as IRunResult);
          }
        }
      );
    }),

  close: () =>
    new Promise((resolve, reject) => {
      db.close((err: Error | null) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    }),
});

export const create = (filename: string) =>
  wrap(new sqlite3.Database(filename));
