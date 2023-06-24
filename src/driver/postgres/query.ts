import type { Database } from "./db";
import { IBuilder, empty } from "../../query/builder";
import compileBuilder from "./compile-builder";

interface IRow {
	id: number;
	json: any;
}

export const queryRaw = async (
	db: Database,
	build: (_: IBuilder) => IBuilder,
) => {
	const args = compileBuilder(build(empty()));
	const rows = await db.all(...args);
	// TODO: this cast is not ideal
	return (rows as unknown as IRow[]).map(({ id, json }) => ({
		id,
		...json,
	}));
};
