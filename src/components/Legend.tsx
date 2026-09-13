export default function Legend() {
  return (
    <div className="legend">
      <p className="rubric">How to mark</p>
      <dl className="legend-list">
        <div className="legend-row"><dt><code>Q:</code></dt><dd>starts a question</dd></div>
        <div className="legend-row"><dt><code>*</code></dt><dd>a correct answer</dd></div>
        <div className="legend-row"><dt><code>-</code></dt><dd>a wrong answer</dd></div>
        <div className="legend-row"><dt><code>&gt;</code></dt><dd>a note shown after answering</dd></div>
        <div className="legend-row"><dt><code>#</code></dt><dd>a line to ignore</dd></div>
        <div className="legend-row"><dt><code>$…$</code></dt><dd>LaTeX, typeset inline</dd></div>
        <div className="legend-row"><dt><code>$$…$$</code></dt><dd>LaTeX, centred on its own line</dd></div>
      </dl>
      <p className="legend-foot">
        Mark two or more answers with <code>*</code> and the question becomes pick-all-that-apply.
      </p>
      <p className="legend-foot">
        Math stays on one line. Prices survive: <code>$5</code> is prose, <code>$5x$</code> is math.
        Write <code>\$</code> for a stubborn dollar sign.
      </p>
    </div>
  );
}
