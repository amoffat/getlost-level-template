import { BaseTilesetDoc } from "../schema";

export interface Migration {
  from: number;
  to: number;
  migrate: (data: BaseTilesetDoc) => Promise<void> | void;
}

export async function getMigrations(): Promise<Migration[]> {
  // Auto-discover files like "N_to_M.ts" and build the migration list.
  // Use eager glob so modules are included upfront and available synchronously.
  const modules = import.meta.glob("./*.ts", { eager: true });

  const migrations = Object.entries(modules)
    .map(([path, mod]) => {
      const match = path.match(/\/(\d+)_to_(\d+)\.ts$/);
      if (!match) return null;
      const m: any = mod;
      if (!m || typeof m["migrate"] !== "function") return null;
      return {
        from: Number(match[1]),
        to: Number(match[2]),
        migrate: m.migrate as Migration["migrate"],
      } as Migration;
    })
    .filter(Boolean) as Migration[];
  migrations.sort((a, b) => a.from - b.from);
  return migrations;
}
