import type { Metadata } from "next";
import { currentUserId } from "@/auth";
import MineList from "@/components/MineList";
import SetupNotice from "@/components/SetupNotice";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listSavedByUser, listSheetsByOwner, type OwnedSheet, type SavedSheetRow } from "@/lib/quizzes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Quizzes" };

export default async function MinePage() {
  const userId = await currentUserId();

  let sheets: OwnedSheet[] = [];
  let saved: SavedSheetRow[] = [];
  if (userId) {
    try {
      [sheets, saved] = await Promise.all([listSheetsByOwner(userId), listSavedByUser(userId)]);
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) return <SetupNotice />;
      throw error;
    }
  }

  // A sheet you wrote is already under "Made by you"; do not list it twice.
  const savedOnly = saved.filter((sheet) => !sheet.mine);

  return <MineList signedIn={Boolean(userId)} sheets={sheets} saved={savedOnly} />;
}
