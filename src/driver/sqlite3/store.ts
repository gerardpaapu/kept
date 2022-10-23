import { queryRaw } from "./query";
import type { IBuilder } from "../../query/builder";
import type { IKept, TJSON } from "../../IKept";
import * as DB from "./db";

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

    // TODO: concurrency issue
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

  const addAll = async (objects: TJSON[]): Promise<void> => {
    const db = await getConnection();
    await db.run("BEGIN TRANSACTION");
    for (const object of objects) {
      // TODO: use a prepared commit
      await db.run(
        "INSERT INTO objects (json) VALUES (?)",
        JSON.stringify(object)
      );
    }

    await db.run("COMMIT");
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

  const update = async <T extends TJSON>(
    id: number,
    mapper: (_: T) => T
  ): Promise<T> => {
    const MAX_ATTEMPTS = 10;
    const DELAY_SIZE = 40;

    const wait = (n: number) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, n);
      });

    const attempt = async (retries: number): Promise<T> => {
      const db = await newConnection();
      let delay: undefined | number;
      let updated: T;

      try {
        await db.run("BEGIN TRANSACTION");
        const current = await db.get(
          `SELECT json FROM objects WHERE id = ?`,
          id
        );
        updated = mapper(JSON.parse(current.json));
        await db.run(
          `REPLACE INTO objects (id, json) VALUES (?, ?)`,
          id,
          JSON.stringify(updated)
        );
        await db.run("COMMIT");
        return updated;
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

      await wait(delay);
      return await attempt(retries + 1);
    };

    return attempt(0);
  };

  return {
    get,
    add,
    addAll,
    put,
    findBy,
    findOneBy,
    delete: delete_,
    all,
    close,
    query,
    update,
  };
};
