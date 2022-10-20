import type { IBuilder } from "./query/builder";
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
   * Save an array of objects to the store
   * @param object
   */
  addAll(object: TJSON[]): Promise<void>;

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

  /**
   * Atomically update a record, this uses transactions and retries so it's expensive and may fail
   *
   * @param id
   * @param mapper
   */
  update<T extends TJSON>(id: number, mapper: (object: T) => T): Promise<void>;
}
