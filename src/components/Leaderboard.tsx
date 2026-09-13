import type { ActiveRunner, LeaderboardEntry } from "@/lib/quizzes";
import { formatDuration } from "@/lib/scoring";

type Props = {
  rows: LeaderboardEntry[];
  active?: ActiveRunner[];
  /** Everyone who has finished it, so the tail can be summarised. */
  totalPlayers?: number;
  /** Marks your own row, so you can find yourself without reading names. */
  meId?: string | null;
};

/**
 * Left to right: runner up, winner, third. The winner stands in the middle on
 * the tallest block, which is the only reason a podium is worth drawing.
 */
const PODIUM_ORDER = [1, 0, 2] as const;

/**
 * The initial shows underneath, so a picture that fails to load or is blocked
 * degrades to something readable instead of a broken image.
 */
function Face({ name, image, size }: { name: string; image: string | null; size: number }) {
  return (
    <span
      className="face"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      <span className="face-initial" aria-hidden="true">
        {name.charAt(0).toUpperCase()}
      </span>
      {image ? (
        // Google's avatar, served from their CDN.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="face-img" src={image} alt="" width={size} height={size} loading="lazy" />
      ) : null}
    </span>
  );
}

/**
 * Best run per person. Anyone who took the quiz without an account still gets
 * a score, they just have no name to stand under.
 *
 * The top three get a podium because a ranking's whole point is that the top
 * is worth looking at; everyone else is a plain row, and past ten it is a
 * count rather than a list nobody reads.
 */
export default function Leaderboard({ rows, active = [], totalPlayers, meId }: Props) {
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const listed = rows.length;
  const beyond = Math.max(0, (totalPlayers ?? listed) - listed);
  const isMine = (row: LeaderboardEntry) => Boolean(meId) && row.userId === meId;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="panel-title">Leaderboard</h2>
        {totalPlayers ? (
          <p className="panel-note">
            {totalPlayers} {totalPlayers === 1 ? "person has" : "people have"} finished this
          </p>
        ) : null}
      </div>

      <div className="panel-body">
        {active.length > 0 ? (
          <ul className="live-list">
            {active.map((runner) => (
              <li key={runner.userId} className="live-row">
                <span className="live-dot" aria-hidden="true" />
                <Face name={runner.name} image={runner.image} size={24} />
                <span className="live-name">{runner.name}</span>
                <span className="live-meta">
                  taking it now
                  {runner.total > 0
                    ? ` · question ${Math.min(runner.position + 1, runner.total)} of ${runner.total}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {rows.length === 0 ? (
          <p className="panel-empty">
            No finished runs yet. Sign in before you take it and your score shows up here.
          </p>
        ) : (
          <>
            <ol className="podium">
              {PODIUM_ORDER.filter((i) => podium[i]).map((i) => {
                const row = podium[i];
                const place = i + 1;
                return (
                  <li
                    key={row.userId}
                    className={`podium-slot is-place-${place}${isMine(row) ? " is-me" : ""}`}
                  >
                    <span className="podium-face">
                      <Face name={row.name} image={row.image} size={place === 1 ? 56 : 44} />
                      <span className="podium-rank" aria-hidden="true">
                        {place}
                      </span>
                    </span>
                    <span className="podium-name">
                      {row.name}
                      {isMine(row) ? <span className="board-you">you</span> : null}
                    </span>
                    <span className="podium-points">{row.points.toLocaleString()}</span>
                    <span className="podium-meta">
                      {row.score}/{row.total} right
                    </span>
                    <span className="podium-block" aria-hidden="true" />
                  </li>
                );
              })}
            </ol>

            {rest.length > 0 ? (
              <ol className="board-list" start={4}>
                {rest.map((row, index) => (
                  <li
                    key={row.userId}
                    className={`board-card${isMine(row) ? " is-me" : ""}`}
                  >
                    <span className="board-rank">{index + 4}</span>
                    <Face name={row.name} image={row.image} size={32} />
                    <span className="board-name">
                      {row.name}
                      {isMine(row) ? <span className="board-you">you</span> : null}
                    </span>
                    <span className="board-meta">
                      {row.score}/{row.total} right · {formatDuration(row.durationMs)}
                    </span>
                    <span className="board-points">{row.points.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {beyond > 0 ? (
              <p className="board-more">
                {beyond} more {beyond === 1 ? "person has" : "people have"} tried this quiz
              </p>
            ) : null}

            <p className="panel-foot">
              Points reward knowing it, then answering quickly. A wrong answer scores nothing.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
