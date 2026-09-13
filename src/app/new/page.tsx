import type { Metadata } from "next";
import Composer from "@/components/Composer";

export const metadata: Metadata = {
  title: "New quiz",
  description: "Build a quiz by hand, paste it as text, or upload a file.",
};

export default function NewSheetPage() {
  return <Composer mode="create" />;
}
