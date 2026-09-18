import type { Metadata } from "next";
import AiPrompt from "@/components/AiPrompt";

export const metadata: Metadata = {
  title: "Write it with a chatbot",
  description:
    "Hand Claude, Gemini or ChatGPT your reviewer and this brief, and get back a sheet Sagot reads.",
};

export default function AiPage() {
  return <AiPrompt />;
}
