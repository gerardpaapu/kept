import { newDb } from "pg-mem";

export interface IRow {
  id: string;
  json: any;
}

// export type IRunResult = { lastID: number; changes: unknown };

export interface Database {
  get(sql: string, ...params: (number | string)[]): Promise<IRow>;
  all(sql: string, ...params: (number | string)[]): Promise<IRow[]>;
  run(sql: string, ...params: (number | string)[]): Promise<IRow[]>;
  close(): Promise<void>;
  unwrap(): PgClient;
}

interface Result {
  rows: unknown[];
}

interface PgClient {
  query(sql: string, values?: (string | number)[]): Promise<Result>;
  end(): Promise<void>;
}

const wrap = (db: PgClient): Database => ({
  unwrap: () => db,

  get: async (sql, ...params) => {
    const result = await db.query(sql, params);
    const { rows } = result;
    return rows[0] as IRow;
  },

  all: async (sql, ...params) => {
    console.log({ sql, params });

    const { rows } = await db.query(sql, params);
    return rows as IRow[];
  },

  run: async (sql, ...params) => {
    const result = await db.query(sql, params);
    return result as any;
  },

  close: () => db.end(),
});

export const create = () => {
  const { Client } = newDb().adapters.createPg();

  return wrap(new Client());
};
