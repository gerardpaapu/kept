import { queryRaw } from "./query";
import type { IBuilder } from "../../query/builder";
import type { IKept, TJSON } from "../../IKept";
import * as DB from "./db";

/**
 * Create a new store using the existing PostrgresQL database as a backing store
 *
 * @param connectionString
 * @returns
 */
export const Store = (connectionString: string): IKept => {
  let db: Promise<DB.Database> | undefined;

  const newConnection = async (): Promise<DB.Database> => {
    const db = DB.create(connectionString);
    await db.run(
      `CREATE TABLE IF NOT EXISTS objects (id serial PRIMARY KEY, json JSON);`
    );
    return db;
  };

  const getConnection = async (): Promise<DB.Database> => {
    if (db) {
      return db;
    }

    db = newConnection();
    return db;
  };

  const get = async (id: number): Promise<TJSON | undefined> => {
    const db = await getConnection();
    const row = await db.get(`SELECT json FROM objects WHERE id = $1`, id);
    if (row == null) {
      return undefined;
    }

    return row.json;
  };

  const findBy = async (
    key: string,
    value: string | number
  ): Promise<TJSON[]> => {
    const db = await getConnection();
    const json = await db.all(
      `SELECT id, json FROM objects WHERE (json::json->>$1) = $2`,
      `${key}`,
      value
    );
    return json.map((s) => ({ id: s.id, ...s.json }));
  };

  const findOneBy = async (
    key: string,
    value: string | number
  ): Promise<TJSON | undefined> => {
    const db = await getConnection();
    const row = await db.get(
      `SELECT id, json FROM objects WHERE json::json->>$1 = $2`,
      `${key}`,
      value
    );

    if (row == null) {
      return undefined;
    }

    return { id: row.id, ...row.json };
  };

  const put = async (id: number, object: TJSON): Promise<void> => {
    const db = await getConnection();
    await db.run(
      `INSERT INTO objects (id, json) VALUES ($1, $2)
       ON CONFLICT (id)
       DO UPDATE SET json = EXCLUDED.json`,
      id,
      JSON.stringify(object)
    );
  };

  const add = async (object: TJSON): Promise<number> => {
    const db = await getConnection();
    const result = await db.run(
      "INSERT INTO objects (id, json) VALUES (default, $1) RETURNING id",
      JSON.stringify(object)
    );

    const { rows } = result as any;
    return rows[0].id;
  };

  const delete_ = async (key: number): Promise<void> => {
    const db = await getConnection();
    await db.run("DELETE FROM objects WHERE id = $1", key);
  };

  const all = async () => {
    const db = await getConnection();
    const results = await db.all(`SELECT id, json FROM objects`);
    return results.map(({ id, json }) => ({ id, ...json }));
  };

  const close = async () => {
    if (db != null) {
      const pool = await db;
      await pool.close();
    }
  };

  const query = async (build: (_: IBuilder) => IBuilder) => {
    const db = await getConnection();
    return queryRaw(db, build) as Promise<TJSON[]>;
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
      const pool = await getConnection();
      const db = await pool.unwrap().connect();

      let delay: undefined | number;
      try {
        await db.query("BEGIN");
        await db.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
        try {
          const current = await db.query(
            `SELECT json FROM objects WHERE id = $1`,
            [id]
          );
          const updated = mapper(current.rows[0].json);
          await db.query(`UPDATE objects SET json = $2 WHERE id = $1`, [
            id,
            JSON.stringify(updated),
          ]);
          await db.query("COMMIT");
        } catch (e) {
          await db.query("ROLLBACK");
          throw e;
        }
      } catch (error) {
        if (
          retries <= MAX_ATTEMPTS &&
          error != null &&
          (error as any).code === "40001"
        ) {
          const maxDelay = DELAY_SIZE * Math.pow(2, retries);
          delay = Math.floor(Math.random() * maxDelay);
        } else {
          throw error;
        }
      } finally {
        db.release();
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
    update,
  };
};
