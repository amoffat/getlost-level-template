import { buildMigrations, GenericMigration } from "@/utils/migrations";
import { BaseStoryDoc } from "../schema";

export type Migration = GenericMigration<BaseStoryDoc>;

export async function getMigrations(): Promise<Migration[]> {
  const modules = import.meta.glob("./*.ts", { eager: true });
  return buildMigrations<BaseStoryDoc>(modules);
}
