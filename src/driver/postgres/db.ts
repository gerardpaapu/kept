import { Pool } from "pg";

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
	unwrap(): Pool;
}

const wrap = (db: Pool): Database => ({
	unwrap: () => db,

	get: async (sql, ...params) => {
		const result = await db.query(sql, params);
		const { rows } = result;
		return rows[0] as IRow;
	},

	all: async (sql, ...params) => {
		const { rows } = await db.query(sql, params);
		return rows as IRow[];
	},

	run: async (sql, ...params) => {
		const result = await db.query(sql, params);
		return result as any;
	},

	close: () => db.end(),
});

export const create = (connectionString: string): Database => {
	const pool = new Pool({ connectionString });
	return wrap(pool);
};
