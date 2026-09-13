import type { Metadata } from "next";
import QuizRunner from "@/components/QuizRunner";
import { parseSheet } from "@/lib/parse";
import { SAMPLE_SOURCE } from "@/lib/sample";

export const metadata: Metadata = {
  title: "Demo quiz",
  description: "A sample sheet, so you can see how taking one works.",
};

/** Runs from the bundled sample, so the demo works with no database at all. */
export default function DemoPage() {
  const { questions } = parseSheet(SAMPLE_SOURCE);

  return (
    <div className="screen screen-narrow">
      <QuizRunner title="Demo quiz" questions={questions} footnote="Nothing here is saved." />
    </div>
  );
}
