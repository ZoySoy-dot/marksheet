import { ImageResponse } from "next/og";
import { getQuizBySlug } from "@/lib/quizzes";

/**
 * The card a quiz link renders as in a group chat.
 *
 * This is the most-seen surface in the whole product. A sheet gets pasted into
 * a block chat once and forty people see this image; almost none of them will
 * ever visit the landing page. It is drawn rather than photographed so it works
 * for any sheet, and kept to a few large elements because a chat preview is
 * shown small.
 */
export const runtime = "nodejs";
export const alt = "A quiz on Sagot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#18181B";
const MUTED = "#52525B";
const LINE = "#E4E4E7";
const ACCENT = "#2563EB";

/**
 * The filled bubble from the masthead, as the one piece of brand furniture.
 *
 * Ring and dot are the same fractions of the diameter as --bubble-ring and
 * --bubble-gap in globals.css, so a link preview carries the mark the app and
 * the favicon use rather than a near miss of it.
 */
const RING = 0.125;
const DOT = 0.375;

function Bubble({ size: s = 34, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: s,
        border: `${s * RING}px solid ${filled ? ACCENT : LINE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {filled ? (
        <div style={{ width: s * DOT, height: s * DOT, borderRadius: s, background: ACCENT }} />
      ) : null}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = "A quiz";
  let count = 0;
  try {
    const quiz = await getQuizBySlug(slug);
    if (quiz) {
      title = quiz.title;
      count = quiz.questionCount;
    }
  } catch {
    // A card is never worth failing a page load over. The generic one is fine.
  }

  // Long titles are the common case, not the exception: a sheet is often named
  // after a whole course. Shrink rather than clip, and clip only past the point
  // where shrinking stops helping.
  const display = title.length > 110 ? `${title.slice(0, 107).trimEnd()}…` : title;
  const fontSize = display.length > 80 ? 54 : display.length > 45 ? 68 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FFFFFF",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Bubble size={34} />
          <div style={{ fontSize: 30, fontWeight: 600, color: INK, letterSpacing: -0.5 }}>
            Sagot
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize,
              fontWeight: 700,
              color: INK,
              letterSpacing: -2,
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            {display}
          </div>
          {/* Three bubbles with the last one marked: the whole product in one
              glyph, and legible even at chat-preview size. */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Bubble size={26} filled={false} />
            <Bubble size={26} filled={false} />
            <Bubble size={26} />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${LINE}`,
            paddingTop: 28,
            fontSize: 30,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>
            {count > 0 ? `${count} question${count === 1 ? "" : "s"}` : "Take it"}
          </div>
          <div style={{ display: "flex" }}>No account needed</div>
        </div>
      </div>
    ),
    size,
  );
}
