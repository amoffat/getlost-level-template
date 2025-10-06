import { buildMigrations, GenericMigration } from "@/utils/migrations";
import { BaseMapDoc } from "../schema";

export type Migration = GenericMigration<BaseMapDoc>;

export async function getMigrations(): Promise<Migration[]> {
  const modules = import.meta.glob("./*.ts", { eager: true });
  return buildMigrations<BaseMapDoc>(modules);
}
