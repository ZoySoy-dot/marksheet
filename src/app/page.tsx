import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sagot: find out what you actually know",
  description:
    "Upload your reviewer and get a quiz back. Take it, see what you missed, send the link to the group chat.",
};

/**
 * The highlighted phrase is the answer to the question shown underneath it, so
 * the two cards read as cause and effect rather than as two unrelated samples.
 */
const HIGHLIGHT = "the mitochondria";

const PREVIEW = {
  question: "Where does aerobic respiration take place?",
  options: [
    { text: "The nucleus", marked: false },
    { text: "The ribosomes", marked: false },
    { text: "The mitochondria", marked: true },
  ],
};

const STEPS = [
  {
    name: "Drop in your reviewer",
    note: "A PDF, photos of your pages, or notes you paste in. It reads them and writes the questions.",
  },
  {
    name: "Check what it wrote",
    note: "Everything opens in the editor first. Fix a question, cut one, add your own.",
  },
  {
    name: "Send the link",
    note: "Whoever you send it to takes it in a browser. They need no account, and no app.",
  },
];

const GAINS = [
  {
    name: "You find the gaps",
    note: "Mark each answer as you go, or hold everything back like a real test and read the damage at the end.",
  },
  {
    name: "You drill only the gaps",
    note: "Go again on the questions you got wrong, instead of starting the whole reviewer from page one.",
  },
  {
    name: "You study together",
    note: "Everyone takes the same sheet from one link, and the scores land on a board underneath it.",
  },
];

const EXAMPLE = `Q: What is the capital of France?
- London
- Berlin
* Paris`;

const LIMITS = [
  "PDFs, photos and plain text. Export a Word file as a PDF first.",
  "Up to 20 MB a file, and 120 questions a sheet.",
  "Writing and sharing a sheet is free. Having AI write one from a document costs credits, from ₱49.",
  "Read it before you share it. AI gets things wrong, and a sheet that drills a wrong answer is worse than no sheet.",
];

export default function LandingPage() {
  return (
    <div className="screen">
      <section className="hero">
        <div>
          <h1>Find out what you actually know.</h1>
          <p className="hero-lead">
            Upload your reviewer and Sagot writes the questions. Take it, see what you
            missed, then send the link to the group chat. Free, with a Google account.
          </p>
          <div className="actions">
            <Link className="btn btn-primary btn-lg" href="/new">
              Upload your reviewer
            </Link>
            <Link className="btn btn-quiet btn-lg" href="/demo">
              Take a demo quiz
            </Link>
          </div>
        </div>

        <div className="hero-aside" aria-hidden="true">
          <div className="flow-step">
            <p className="mini-label">Your notes</p>
            <p className="notes-card">
              Aerobic respiration takes place in <mark className="hl">{HIGHLIGHT}</mark>, where
              glucose is broken down to release ATP.
            </p>
          </div>
          <p className="hero-arrow">↓</p>
          <div className="flow-step">
            <p className="mini-label">What it becomes</p>
            <div className="guide-preview">
              <p className="guide-q">{PREVIEW.question}</p>
              <div className="opts">
                {PREVIEW.options.map((row) => (
                  <span
                    key={row.text}
                    className={`opt opt-static${row.marked ? " is-marked" : ""}`}
                  >
                    <span className="bubble">
                      <span className="bubble-fill" />
                    </span>
                    <span className="opt-text">{row.text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <h2>A quiz in about a minute</h2>
        <div className="wash">
          <ol className="steps">
            {STEPS.map((step) => (
              <li key={step.name}>
                <p className="step-name">{step.name}</p>
                <p className="step-note">{step.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="band">
        <h2>Rereading only feels like studying.</h2>
        <p className="deck">
          You remember a page because you have seen it four times, not because you know it.
          Answering is the part that tells you the difference.
        </p>
        <div className="gains">
          {GAINS.map((gain) => (
            <div key={gain.name}>
              <p className="gain-name">{gain.name}</p>
              <p className="gain-note">{gain.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="closer">
        <h2>Try it on tonight&rsquo;s reviewer.</h2>
        <div className="actions">
          <Link className="btn btn-primary btn-lg" href="/new">
            Upload your reviewer
          </Link>
        </div>
      </section>

      <section className="fine">
        <div>
          <p className="rubric">Other ways in</p>
          <p className="fine-note">
            Type them yourself if you would rather. Three characters are the whole format, and
            there is a form to fill in if you would rather not think about it at all.
          </p>
          <pre className="guide-code">{EXAMPLE}</pre>
          <p className="fine-note">
            Or <Link href="/ai">copy our brief</Link> into Claude, Gemini or ChatGPT with your
            material, and paste back the sheet it writes.
          </p>
        </div>
        <div>
          <p className="rubric">Worth knowing</p>
          <ul className="limits">
            {LIMITS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
