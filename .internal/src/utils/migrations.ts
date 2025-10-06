// Generic migration discovery helper shared by different persistence modules.
// Each persistence area (e.g., tileset, map) keeps its own migrations folder
// with files named like "N_to_M.ts" exporting a `migrate(data)` function.

export interface GenericMigration<TBaseDoc> {
  from: number;
  to: number;
  migrate: (data: TBaseDoc) => Promise<void> | void;
}

// Build a sorted list of migrations from the provided eager glob modules.
// Pass the result of import.meta.glob("./*.ts", { eager: true }).
export function buildMigrations<TBaseDoc>(
  modules: Record<string, any>
): GenericMigration<TBaseDoc>[] {
  const migrations = Object.entries(modules)
    .map(([path, mod]) => {
      const match = path.match(/\/(\d+)_to_(\d+)\.ts$/);
      if (!match) return null;
      if (!mod || typeof mod["migrate"] !== "function") return null;
      return {
        from: Number(match[1]),
        to: Number(match[2]),
        migrate: mod.migrate as GenericMigration<TBaseDoc>["migrate"],
      } as GenericMigration<TBaseDoc>;
    })
    .filter(Boolean) as GenericMigration<TBaseDoc>[];
  migrations.sort((a, b) => a.from - b.from);
  return migrations;
}
