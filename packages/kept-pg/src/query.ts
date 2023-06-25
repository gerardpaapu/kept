import type { Database } from "./db";
import { IBuilder, empty } from "@donothing/kept-core/dist/builder";
import compileBuilder from "@donothing/kept-dialect-postgresql";

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
