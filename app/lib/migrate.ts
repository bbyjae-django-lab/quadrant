import { getSupabaseClient } from "./supabaseClient";
import { LocalAdapter, createSupabaseAdapter } from "./storageAdapter";

const MIGRATION_FLAG = "quadrant_migrated_to_supabase";

export const hasMigratedToSupabase = () => {
  if (typeof window === "undefined") {
    return true;
  }
  return localStorage.getItem(MIGRATION_FLAG) === "true";
};

export const markMigratedToSupabase = () => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(MIGRATION_FLAG, "true");
};

export const migrateLocalToSupabase = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  if (hasMigratedToSupabase()) {
    return;
  }
  const runs = await LocalAdapter.loadRuns();
  if (runs.length === 0) {
    markMigratedToSupabase();
    return;
  }
  const supabaseAdapter = createSupabaseAdapter(userId);
  try {
    for (const run of runs) {
      await supabaseAdapter.saveRun(run);
      const notes = run.notes ?? [];
      if (notes.length === 0) {
        continue;
      }
      const checkins = notes.map((note, index) => ({
        id: `${run.id}-${index}`,
        runId: run.id,
        dayIndex: index + 1,
        result: "clean" as const,
        note: note.note,
        createdAt: new Date(note.date).toISOString(),
      }));
      for (const checkin of checkins) {
        await supabaseAdapter.addCheckin(checkin);
      }
    }
    markMigratedToSupabase();
  } catch (error) {
    console.warn("Supabase migration failed.", error);
  }
};
