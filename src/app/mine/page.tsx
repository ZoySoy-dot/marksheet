import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import MineList from "@/components/MineList";
import SetupNotice from "@/components/SetupNotice";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listSheetsByOwner, type OwnedSheet } from "@/lib/quizzes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My sheets" };

export default async function MinePage() {
  const { userId } = await auth();

  let sheets: OwnedSheet[] = [];
  if (userId) {
    try {
      sheets = await listSheetsByOwner(userId);
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) return <SetupNotice />;
      throw error;
    }
  }

  return <MineList signedIn={Boolean(userId)} sheets={sheets} />;
}
