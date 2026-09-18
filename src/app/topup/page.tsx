import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import TopUp from "@/components/TopUp";
import { isConfigured } from "@/lib/paymongo";
import { PACKS } from "@/lib/usage";

export const metadata: Metadata = {
  title: "Top up",
  description: "Buy more credits. One credit has AI make a quiz from a document, and credits never expire.",
};

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ paid?: string; cancelled?: string }> };

export default async function TopUpPage({ searchParams }: Props) {
  // A balance belongs to an account, so there is nothing to show without one.
  if (!(await currentUserId())) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/topup")}`);
  }

  const params = await searchParams;

  return (
    <TopUp
      packs={PACKS}
      live={isConfigured()}
      paid={params.paid === "1"}
      cancelled={params.cancelled === "1"}
    />
  );
}
