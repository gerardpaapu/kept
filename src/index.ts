import sqlite3 from "sqlite3";

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
   * Save an object to the store, returns the id assigned to the object
   * @param object
   */
  put(object: TJSON): Promise<number>;

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
}

export interface IRow {
  id: string;
  json: string;
}

/**
 * Create a new store. A sqlite3 db is created at the given path.
 *
 * Use ':memory:' to create an in memory store
 * @param filename
 * @returns
 */
export const Store = (filename: string): IKept => {
  let db: sqlite3.Database | undefined;

  const init = (): Promise<sqlite3.Database> => {
    if (db == null) {
      return new Promise((resolve, reject) => {
        db = new sqlite3.Database(filename);
        db.exec(
          `CREATE TABLE IF NOT EXISTS 
          objects (id INTEGER PRIMARY KEY, json TEXT);`,
          (err) => {
            if (err != null) {
              reject(err);
            } else {
              resolve(db!);
            }
          }
        );
      });
    }

    return Promise.resolve(db);
  };

  const getByIdRaw = (
    db: sqlite3.Database,
    id: number
  ): Promise<IRow | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT json FROM objects WHERE id = ?`,
        JSON.stringify(id),
        (err, row) => {
          if (err != null) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  };

  const get = async (id: number): Promise<TJSON | undefined> => {
    const db = await init();
    const row = await getByIdRaw(db, id);
    if (row == null) {
      return undefined;
    }

    return JSON.parse(row.json);
  };

  const findByRaw = (
    db: sqlite3.Database,
    key: string,
    value: string | number
  ): Promise<IRow[]> => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, json FROM objects WHERE json_extract(json, ?) = ?`,
        `$.${key}`,
        value,
        (err: Error | undefined, results: { id: string; json: string }[]) => {
          if (err != null) {
            reject(err);
          } else {
            resolve(results);
          }
        }
      );
    });
  };

  const findBy = async (
    key: string,
    value: string | number
  ): Promise<TJSON[]> => {
    const db = await init();
    const json = await findByRaw(db, key, value);
    return json.map((s) => ({ id: s.id, ...JSON.parse(s.json) }));
  };

  const findOneByRaw = (
    db: sqlite3.Database,
    key: string,
    value: string | number
  ): Promise<IRow | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id, json FROM objects WHERE json_extract(json, ?) = ?`,
        `$.${key}`,
        value,
        (err: Error | undefined, row: IRow | undefined) => {
          if (err != null) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  };

  const findOneBy = async (
    key: string,
    value: string | number
  ): Promise<TJSON | undefined> => {
    const db = await init();
    const row = await findOneByRaw(db, key, value);
    if (row == null) {
      return undefined;
    }

    return { id: row.id, ...JSON.parse(row.json) };
  };

  const putRaw = (db: sqlite3.Database, value: TJSON): Promise<number> => {
    return new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO objects (json) VALUES (?)",
        JSON.stringify(value),
        function (err: Error | undefined) {
          if (err != null) {
            reject(err);
          } else {
            resolve((this as any).lastID);
          }
        }
      );
    });
  };

  const put = async (object: TJSON): Promise<number> => {
    const db = await init();
    const id = await putRaw(db, object);
    return id;
  };

  const deleteRaw = (
    db: sqlite3.Database,
    key: string | number
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(
        "DELETE FROM objects WHERE id = ?",
        JSON.stringify(key),
        (err: Error | undefined) => {
          if (err != null) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  };

  const delete_ = async (key: string | number): Promise<void> => {
    const db = await init();
    return deleteRaw(db, key);
  };

  const allRaw = (db: sqlite3.Database): Promise<IRow[]> =>
    new Promise((resolve, reject) => {
      db.all(`SELECT id, json FROM objects`, (err, results) => {
        if (err != null) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });

  const all = async () => {
    const db = await init();
    const results = await allRaw(db);
    return results.map(({ id, json }) => ({ id, ...JSON.parse(json) }));
  };

  const close = () =>
    new Promise<void>((resolve, reject) => {
      if (db == null) {
        resolve();
        return;
      }

      db.close((err) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

  return { get, put, findBy, findOneBy, delete: delete_, all, close };
};
