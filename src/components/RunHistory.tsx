import TeX from "@/components/TeX";
import type { RunRecord } from "@/lib/quizzes";
import { formatDuration, scorePercent } from "@/lib/scoring";

export type TroubleQuestion = { text: string; wrong: number; seen: number };

type Props = {
  runs: RunRecord[];
  trouble: TroubleQuestion[];
  signedIn: boolean;
};

const day = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/**
 * What has happened on this quiz before now, as two clearly separate panels.
 *
 * Only exists for someone signed in: a run with no account behind it cannot be
 * attributed to anyone, so there is nothing to build a history from.
 */
export default function RunHistory({ runs, trouble, signedIn }: Props) {
  if (!signedIn) {
    return (
      <section className="panel">
        <div className="panel-body">
          <p className="panel-empty">
            Sign in and your runs are kept, so you can see what you keep getting wrong.
          </p>
        </div>
      </section>
    );
  }

  if (runs.length === 0) return null;

  const best = runs.reduce((top, run) => (run.points > top.points ? run : top), runs[0]);
  // runs[0] is this run, so the one before it is what to compare against.
  const latest = runs[0];
  const previous = runs[1];
  const delta = previous ? latest.points - previous.points : null;

  return (
    <>
      {trouble.length > 0 ? (
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">What keeps catching you out</h2>
            <p className="panel-note">Wrong answers out of times seen</p>
          </div>
          <div className="panel-body">
            <ol className="trouble-list">
              {trouble.map((item) => (
                <li key={item.text} className="trouble-row">
                  <span className="trouble-count">
                    {item.wrong}
                    <span className="trouble-of">/{item.seen}</span>
                  </span>
                  <span className="trouble-q">
                    <TeX>{item.text}</TeX>
                  </span>
                </li>
              ))}
            </ol>
            <p className="panel-foot">Working on your mistakes moves these fastest.</p>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">Your runs</h2>
          <p className="panel-note">
            {runs.length} {runs.length === 1 ? "attempt" : "attempts"}
          </p>
        </div>
        <div className="panel-body">
          <p className="history-line">
            {delta === null
              ? "First time through."
              : delta > 0
                ? `Up ${delta.toLocaleString()} points on your last run.`
                : delta < 0
                  ? `Down ${Math.abs(delta).toLocaleString()} points on your last run.`
                  : "Same score as last time."}
            {best.points > latest.points
              ? ` Your best is ${best.points.toLocaleString()}.`
              : runs.length > 1
                ? " That is your best yet."
                : ""}
          </p>

          <ol className="run-list">
            {runs.map((run, index) => {
              const percent = scorePercent(run.points, run.total);
              return (
                <li
                  key={`${run.takenAt}-${index}`}
                  className={`run-row${index === 0 ? " is-latest" : ""}`}
                >
                  <span className="run-bar" aria-hidden="true">
                    <span className="run-bar-fill" style={{ width: `${Math.max(2, percent)}%` }} />
                  </span>
                  <span className="run-score">
                    {run.score}/{run.total}
                  </span>
                  <span className="run-points">{run.points.toLocaleString()}</span>
                  <span className="run-meta">
                    {formatDuration(run.durationMs)} · {day(run.takenAt)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </>
  );
}
