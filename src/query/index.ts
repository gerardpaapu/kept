import type { Database } from "../db";
import type { IBuilder } from "./builder";
import * as Builder from "./builder";

interface IRow {
  id: number;
  json0: string;
}

export const queryRaw = async (
  db: Database,
  build: (_: IBuilder) => IBuilder
) => {
  const args = Builder.compile(build(Builder.empty()));
  const rows = await db.all(...args);
  // TODO: this cast is not ideal
  return (rows as unknown as IRow[]).map(({ id, json0: json }) => ({
    id,
    ...JSON.parse(json),
  }));
};
