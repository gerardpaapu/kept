import type { Database } from "../db";
import { IBuilder, empty } from "./wrapped-builder";
import compileBuilder from "./compile-builder";

interface IRow {
  id: number;
  json0: string;
}

export const queryRaw = async (
  db: Database,
  build: (_: IBuilder) => IBuilder
) => {
  const args = compileBuilder(build(empty()));
  const rows = await db.all(...args);
  // TODO: this cast is not ideal
  return (rows as unknown as IRow[]).map(({ id, json0: json }) => ({
    id,
    ...JSON.parse(json),
  }));
};
