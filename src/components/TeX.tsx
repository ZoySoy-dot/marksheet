"use client";

import { useMemo } from "react";
import { mathToHtml } from "@/lib/tex";

/** Renders author text with any $…$ or $$…$$ turned into typeset math. */
export default function TeX({ children, className }: { children: string; className?: string }) {
  const html = useMemo(() => mathToHtml(children), [children]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A comma-separated run of author text, each piece typeset. */
export function TeXList({ texts, empty }: { texts: string[]; empty: string }) {
  if (texts.length === 0) return <>{empty}</>;
  return (
    <>
      {texts.map((text, i) => (
        <span key={`${i}-${text}`}>
          {i > 0 ? ", " : ""}
          <TeX>{text}</TeX>
        </span>
      ))}
    </>
  );
}
