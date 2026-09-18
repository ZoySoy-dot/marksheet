import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import Composer from "@/components/Composer";

export const metadata: Metadata = {
  title: "New quiz",
  description:
    "Build a quiz by hand, paste it as text, or upload a file. Making one needs a free account.",
};

export default async function NewSheetPage() {
  // Signed out, the editor never renders at all: there is no point handing
  // someone a sheet they would not be allowed to publish. The API refuses the
  // same request on its own, so this is the courtesy, not the enforcement.
  if (!(await currentUserId())) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent("/new")}`);
  }

  return <Composer mode="create" />;
}
