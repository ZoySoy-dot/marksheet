import Link from "next/link";

export default function NotFound() {
  return (
    <div className="screen screen-narrow">
      <p className="rubric">Nothing here</p>
      <h1 className="display display-md">Blank sheet</h1>
      <p className="deck">
        That link does not match any sheet. It may have been deleted, or the link picked up a typo
        on the way over.
      </p>
      <div className="actions">
        <Link className="btn btn-primary" href="/new">
          Make a quiz
        </Link>
        <Link className="btn btn-quiet" href="/quizzes">
          Quizzes
        </Link>
      </div>
    </div>
  );
}
