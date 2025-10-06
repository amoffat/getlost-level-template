import { buildMigrations, GenericMigration } from "@/utils/migrations";
import { BaseTilesetDoc } from "../schema";

export type Migration = GenericMigration<BaseTilesetDoc>;

export async function getMigrations(): Promise<Migration[]> {
  const modules = import.meta.glob("./*.ts", { eager: true });
  return buildMigrations<BaseTilesetDoc>(modules);
}
