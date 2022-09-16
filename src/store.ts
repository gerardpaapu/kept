import { queryRaw } from "./query";
import {
  wrappedQueryRaw,
  IBuilder as IWrappedBuilder,
} from "./query/wrapped-builder";
import type { IBuilder } from "./query/builder";
import * as DB from "./db";

export type TJSON =
  | string
  | number
  | TJSON[]
  | { [_: string | number]: TJSON }
  | null;

export interface IKept {
  /**
   * Get the object stored with the given id
   *
   * @param id
   */
  get(id: number): Promise<TJSON | undefined>;

  /**
   * Update the object stored with the given id or store a new object at that id
   *
   * @param id
   * @param object
   */
  put(id: number, object: TJSON): Promise<void>;

  /**
   * Save an object to the store, returns the id assigned to the object
   * @param object
   */
  add(object: TJSON): Promise<number>;

  /**
   * Find all the objects in the store where the key is equal to the given value
   * @param key
   * @param value
   */
  findBy(key: string, value: string | number): Promise<TJSON[]>;

  /**
   * Find the first object in the store where the key is equal to the given value
   */
  findOneBy(key: string, value: string | number): Promise<TJSON | undefined>;

  /**
   * Get all the objects in the store
   */
  all(): Promise<TJSON[]>;

  /**
   * delete the object in the store with this id
   * @param id
   */
  delete(id: number): Promise<void>;

  /**
   * close the connection to the database
   */
  close(): Promise<void>;

  /**
   * Make a more complex query, including orderBy, multiple where clauses and paging
   *
   * @param build
   */
  query(build: (_: IBuilder) => IBuilder): Promise<TJSON[]>;

  wrappedQuery(
    build: (_: IWrappedBuilder) => IWrappedBuilder
  ): Promise<TJSON[]>;

  /**
   * Atomically update a record, this uses transactions and retries so it's expensive and may fail
   *
   * @param id
   * @param mapper
   */
  update<T extends TJSON>(id: number, mapper: (object: T) => T): Promise<void>;
}

/**
 * Create a new store. A sqlite3 db is created at the given path.
 *
 * Use ':memory:' to create an in memory store
 * @param filename
 * @returns
 */
export const Store = (filename: string): IKept => {
  let db: DB.Database | undefined;

  const newConnection = async (): Promise<DB.Database> => {
    const db = DB.create(filename);
    await db.run(
      `CREATE TABLE IF NOT EXISTS objects (id INTEGER PRIMARY KEY, json TEXT);`
    );
    return db;
  };

  const getConnection = async (): Promise<DB.Database> => {
    if (db) {
      return db;
    }

    db = await newConnection();
    return db;
  };

  const get = async (id: number): Promise<TJSON | undefined> => {
    const db = await getConnection();
    const row = await db.get(`SELECT json FROM objects WHERE id = ?`, id);
    if (row == null) {
      return undefined;
    }

    return JSON.parse(row.json);
  };

  const findBy = async (
    key: string,
    value: string | number
  ): Promise<TJSON[]> => {
    const db = await getConnection();
    const json = await db.all(
      `SELECT id, json FROM objects WHERE json_extract(json, ?) = ?`,
      `$.${key}`,
      value
    );
    return json.map((s) => ({ id: s.id, ...JSON.parse(s.json) }));
  };

  const findOneBy = async (
    key: string,
    value: string | number
  ): Promise<TJSON | undefined> => {
    const db = await getConnection();
    const row = await db.get(
      `SELECT id, json FROM objects WHERE json_extract(json, ?) = ?`,
      `$.${key}`,
      value
    );

    if (row == null) {
      return undefined;
    }

    return { id: row.id, ...JSON.parse(row.json) };
  };

  const put = async (id: number, object: TJSON): Promise<void> => {
    const db = await getConnection();
    await db.run(
      "REPLACE INTO objects (id, json) VALUES (?, ?)",
      id,
      JSON.stringify(object)
    );
  };

  const add = async (object: TJSON): Promise<number> => {
    const db = await getConnection();
    const { lastID } = await db.run(
      "INSERT INTO objects (json) VALUES (?)",
      JSON.stringify(object)
    );
    return lastID;
  };

  const delete_ = async (key: number): Promise<void> => {
    const db = await getConnection();
    await db.run("DELETE FROM objects WHERE id = ?", key);
  };

  const all = async () => {
    const db = await getConnection();
    const results = await db.all(`SELECT id, json FROM objects`);
    return results.map(({ id, json }) => ({ id, ...JSON.parse(json) }));
  };

  const close = async () => {
    if (db != null) {
      await db.close();
    }
  };

  const query = async (build: (_: IBuilder) => IBuilder) => {
    const db = await getConnection();
    return queryRaw(db, build) as Promise<TJSON[]>;
  };

  const wrappedQuery = async (
    build: (_: IWrappedBuilder) => IWrappedBuilder
  ) => {
    const db = await getConnection();
    return wrappedQueryRaw(db, build) as Promise<TJSON[]>;
  };

  const update = async <T extends TJSON>(id: number, mapper: (_: T) => T) => {
    const MAX_ATTEMPTS = 10;
    const DELAY_SIZE = 40;

    const wait = (n: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, n);
      });

    const attempt = async (retries: number): Promise<void> => {
      const db = await newConnection();
      let delay: undefined | number;
      try {
        await db.run("BEGIN TRANSACTION");
        const current = await db.get(
          `SELECT json FROM objects WHERE id = ?`,
          id
        );
        const updated = mapper(JSON.parse(current.json));
        await db.run(
          `REPLACE INTO objects (id, json) VALUES (?, ?)`,
          id,
          JSON.stringify(updated)
        );
        await db.run("COMMIT");
      } catch (error) {
        if (retries <= MAX_ATTEMPTS && (error as any).errno === 5) {
          const maxDelay = DELAY_SIZE * Math.pow(2, retries);
          delay = Math.floor(Math.random() * maxDelay);
        } else {
          throw error;
        }
      } finally {
        await db.close();
      }

      if (delay != null) {
        await wait(delay);
        await attempt(retries + 1);
      }
    };

    return attempt(0);
  };

  return {
    get,
    add,
    put,
    findBy,
    findOneBy,
    delete: delete_,
    all,
    close,
    query,
    wrappedQuery,
    update,
  };
};
