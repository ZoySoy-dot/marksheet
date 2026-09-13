import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Marksheet: turn notes into a quiz",
  description: "Write questions as plain text. Share one link. Anyone can take it.",
};

const EXAMPLE = `Q: What is the capital of France?
- London
- Berlin
* Paris`;

const PREVIEW = [
  { text: "London", marked: false },
  { text: "Berlin", marked: false },
  { text: "Paris", marked: true },
];

const STEPS = [
  { name: "Write", note: "Build them in a form, paste text, or upload a file." },
  { name: "Publish", note: "You get a link." },
  { name: "Share", note: "Anyone can take it. No account needed." },
];

const TILES = [
  { name: "Two ways to sit it", note: "Mark each answer as you go, or hold everything back like a real test." },
  { name: "Retry your misses", note: "Go again on only the questions you got wrong." },
  { name: "Maths that looks right", note: "Write LaTeX and it renders properly." },
  { name: "One link to share", note: "Send it to a group chat. Nobody needs an account." },
  { name: "Let AI draft it", note: "Hand your reviewer to a chatbot and paste back the result." },
  { name: "Saved to your account", note: "Sign in and your sheets follow you to any browser." },
];

export default function LandingPage() {
  return (
    <div className="screen">
      <section className="hero">
        <div>
          <h1>Turn notes into a quiz.</h1>
          <p className="hero-lead">
            Write your questions as plain text. Share one link. Anyone can take it.
          </p>
          <div className="actions">
            <Link className="btn btn-primary btn-lg" href="/new">
              Make a quiz
            </Link>
            <Link className="btn btn-quiet btn-lg" href="/demo">
              Try a demo
            </Link>
          </div>
        </div>

        <div className="hero-aside" aria-hidden="true">
          <pre className="guide-code">{EXAMPLE}</pre>
          <p className="hero-arrow">↓</p>
          <div className="guide-preview">
            <p className="guide-q">What is the capital of France?</p>
            <div className="opts">
              {PREVIEW.map((row) => (
                <span key={row.text} className={`opt opt-static${row.marked ? " is-marked" : ""}`}>
                  <span className="bubble">
                    <span className="bubble-fill" />
                  </span>
                  <span className="opt-text">{row.text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.name}>
              <p className="step-name">{step.name}</p>
              <p className="step-note">{step.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="band">
        <h2>What you get</h2>
        <ul className="tiles">
          {TILES.map((tile) => (
            <li key={tile.name}>
              <p className="tile-name">{tile.name}</p>
              <p className="tile-note">{tile.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="closer">
        <h2>Make your first one.</h2>
        <div className="actions">
          <Link className="btn btn-primary btn-lg" href="/new">
            Make a quiz
          </Link>
        </div>
      </section>
    </div>
  );
}
