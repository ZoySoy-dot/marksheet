const EXAMPLE = `Q: What is the capital of France?
- London
- Berlin
* Paris
> Capital since 508 AD.`;

const PREVIEW = [
  { letter: "A", text: "London", marked: false },
  { letter: "B", text: "Berlin", marked: false },
  { letter: "C", text: "Paris", marked: true },
];

/**
 * Shows the format by example rather than by specification. A symbol table
 * tells you what "*" means; this shows you what it does.
 */
export default function FormatGuide() {
  return (
    <section className="guide">
      <h2 className="rubric">How it works</h2>

      <p className="guide-step">You write this</p>
      <pre className="guide-code">{EXAMPLE}</pre>

      <p className="guide-arrow" aria-hidden="true">
        ↓
      </p>

      <p className="guide-step">Anyone with your link gets this</p>
      <div className="guide-preview">
        <p className="qtype rubric">Pick one</p>
        <p className="guide-q">What is the capital of France?</p>
        <div className="opts">
          {PREVIEW.map((row) => (
            <span key={row.letter} className={`opt opt-static${row.marked ? " is-marked" : ""}`}>
              <span className="bubble" aria-hidden="true">
                <span className="bubble-fill" />
              </span>
              <span className="opt-key" aria-hidden="true">
                {row.letter}
              </span>
              <span className="opt-text">{row.text}</span>
            </span>
          ))}
        </div>
      </div>

      <dl className="legend-list">
        <div className="legend-row"><dt><code>Q:</code></dt><dd>starts a question</dd></div>
        <div className="legend-row"><dt><code>*</code></dt><dd>a correct answer</dd></div>
        <div className="legend-row"><dt><code>-</code></dt><dd>a wrong answer</dd></div>
        <div className="legend-row"><dt><code>&gt;</code></dt><dd>a note, shown after they answer</dd></div>
        <div className="legend-row"><dt><code>#</code></dt><dd>a line to ignore</dd></div>
        <div className="legend-row"><dt><code>$…$</code></dt><dd>maths, written in LaTeX</dd></div>
      </dl>

      <p className="legend-foot">
        Mark two or more answers with <code>*</code> and the question turns into pick-all-that-apply
        automatically.
      </p>
    </section>
  );
}
