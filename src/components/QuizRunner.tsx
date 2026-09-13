"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TeX, { TeXList } from "@/components/TeX";
import type { Question } from "@/lib/parse";

type Phase = "ready" | "running" | "report";

/**
 * Reviewer marks each answer the moment you commit to it, so you learn while
 * you go. Test holds everything back until the end, the way the real paper
 * does, though you can still change your mind on the way through.
 */
export type Mode = "reviewer" | "test";

type Settings = {
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  mode: Mode;
};

const DEFAULT_SETTINGS: Settings = {
  shuffleQuestions: false,
  shuffleAnswers: false,
  mode: "reviewer",
};

const SETTINGS_KEY = "marksheet.settings";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isRight(question: Question, picked: readonly string[]): boolean {
  const correct = question.options.filter((o) => o.correct);
  if (correct.length !== picked.length) return false;
  const set = new Set(picked);
  return correct.every((o) => set.has(o.id));
}

const pickedTexts = (question: Question, ids: readonly string[]) =>
  question.options.filter((o) => ids.includes(o.id)).map((o) => o.text);

const correctTexts = (question: Question) =>
  question.options.filter((o) => o.correct).map((o) => o.text);

type Props = {
  title: string;
  questions: Question[];
  /** When present, finished runs are counted against this quiz. */
  slug?: string;
  /** Renders an extra way out of the ready screen, e.g. back to the editor. */
  onLeave?: () => void;
  leaveLabel?: string;
  /** A line under the counts on the ready screen, e.g. how often it has been taken. */
  footnote?: string;
};

export default function QuizRunner({ title, questions, slug, onLeave, leaveLabel, footnote }: Props) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [deck, setDeck] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const posted = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<Settings> & { instant?: boolean };
      setSettings({
        shuffleQuestions: Boolean(saved.shuffleQuestions),
        shuffleAnswers: Boolean(saved.shuffleAnswers),
        // Settings saved before modes existed carried an "instant" flag.
        mode:
          saved.mode === "test" || saved.mode === "reviewer"
            ? saved.mode
            : saved.instant === false
              ? "test"
              : "reviewer",
      });
    } catch {
      /* keep the defaults */
    }
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        /* the choice just will not stick */
      }
      return next;
    });
  };

  const start = useCallback((pool: Question[], s: Settings) => {
    let list = s.shuffleQuestions ? shuffle(pool) : [...pool];
    if (s.shuffleAnswers) {
      list = list.map((q) => ({ ...q, options: shuffle(q.options) }));
    }
    posted.current = false;
    setDeck(list);
    setIndex(0);
    setPicks({});
    setRevealed({});
    setPhase("running");
  }, []);

  const results = useMemo(
    () =>
      deck.map((q) => {
        const picked = picks[q.id] ?? [];
        return { question: q, picked, right: isRight(q, picked) };
      }),
    [deck, picks],
  );

  const score = results.filter((r) => r.right).length;
  const missed = results.filter((r) => !r.right).map((r) => r.question);

  // Count the finished run against the shared quiz. Best effort: a failed
  // count must never interrupt someone's study session.
  useEffect(() => {
    if (phase !== "report" || !slug || posted.current || deck.length === 0) return;
    posted.current = true;
    fetch(`/api/quizzes/${slug}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, total: deck.length }),
      keepalive: true,
    }).catch(() => {});
  }, [phase, slug, score, deck.length]);

  const current = deck[index];

  const togglePick = useCallback(
    (optionId: string) => {
      if (!current || revealed[current.id]) return;
      setPicks((prev) => {
        const chosen = prev[current.id] ?? [];
        if (!current.multi) return { ...prev, [current.id]: [optionId] };
        return {
          ...prev,
          [current.id]: chosen.includes(optionId)
            ? chosen.filter((id) => id !== optionId)
            : [...chosen, optionId],
        };
      });
    },
    [current, revealed],
  );

  const advance = useCallback(() => {
    if (!current) return;
    const picked = picks[current.id] ?? [];
    if (settings.mode === "reviewer" && !revealed[current.id] && picked.length > 0) {
      setRevealed((prev) => ({ ...prev, [current.id]: true }));
      return;
    }
    if (index < deck.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setPhase("report");
  }, [current, picks, settings.mode, revealed, index, deck.length]);

  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (target instanceof HTMLInputElement && target.type === "text") return;

      if (event.key === "Enter") {
        event.preventDefault();
        advance();
        return;
      }
      if (!current) return;

      let position = -1;
      if (/^[a-zA-Z]$/.test(event.key)) position = LETTERS.indexOf(event.key.toUpperCase());
      else if (/^[1-9]$/.test(event.key)) position = Number(event.key) - 1;

      const option = position >= 0 ? current.options[position] : undefined;
      if (option) {
        event.preventDefault();
        togglePick(option.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, advance, togglePick]);

  /* ---------------- ready ---------------- */

  if (phase === "ready") {
    const multiCount = questions.filter((q) => q.multi).length;
    return (
      <>
        <p className="rubric">Ready when you are</p>
        <h1 className="display display-md ready-title">
          <TeX>{title}</TeX>
        </h1>

        <div className="ready-meta">
          <p className="figure">
            <span className="figure-num">{questions.length}</span>
            <span className="figure-label">questions</span>
          </p>
          <p className="figure">
            <span className="figure-num">{multiCount}</span>
            <span className="figure-label">pick all</span>
          </p>
        </div>

        {footnote ? <p className="ready-note">{footnote}</p> : null}

        <fieldset className="modes">
          <legend className="rubric">How it grades you</legend>

          <label className="mode">
            <input
              type="radio"
              name="marksheet-mode"
              checked={settings.mode === "reviewer"}
              onChange={() => updateSettings({ mode: "reviewer" })}
            />
            <span className="bubble" aria-hidden="true">
              <span className="bubble-fill" />
            </span>
            <span className="mode-body">
              <span className="mode-name">Reviewer</span>
              <span className="mode-note">
                Marks every answer the moment you commit, and shows the explanation there and then.
              </span>
            </span>
          </label>

          <label className="mode">
            <input
              type="radio"
              name="marksheet-mode"
              checked={settings.mode === "test"}
              onChange={() => updateSettings({ mode: "test" })}
            />
            <span className="bubble" aria-hidden="true">
              <span className="bubble-fill" />
            </span>
            <span className="mode-body">
              <span className="mode-name">Test</span>
              <span className="mode-note">
                Tells you nothing until the end. Go back and change answers as much as you like,
                then grade the whole sheet at once.
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset className="options">
          <legend className="rubric">Before you start</legend>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.shuffleQuestions}
              onChange={(e) => updateSettings({ shuffleQuestions: e.target.checked })}
            />
            <span className="switch-box" aria-hidden="true" />
            <span className="switch-text">Shuffle questions</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.shuffleAnswers}
              onChange={(e) => updateSettings({ shuffleAnswers: e.target.checked })}
            />
            <span className="switch-box" aria-hidden="true" />
            <span className="switch-text">Shuffle answers</span>
          </label>
        </fieldset>

        <div className="actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => start(questions, settings)}
            disabled={questions.length === 0}
          >
            Start drill
          </button>
          {onLeave ? (
            <button className="btn btn-quiet" type="button" onClick={onLeave}>
              {leaveLabel ?? "Back"}
            </button>
          ) : null}
        </div>
      </>
    );
  }

  /* ---------------- report ---------------- */

  if (phase === "report") {
    const total = deck.length;
    const pct = total ? Math.round((score / total) * 100) : 0;
    return (
      <>
        <div className="report-head">
          <div>
            <h1 className="display display-sm">Results</h1>
            <p className="report-line">
              {score === total ? (
                <>
                  Clean sheet on <TeX>{title}</TeX>.
                </>
              ) : (
                <>
                  {score} of {total} on <TeX>{title}</TeX>. {missed.length} to go back over.
                </>
              )}
            </p>
          </div>
          <div className={`stamp${pct >= 75 ? " is-pass" : ""}`} role="img" aria-label={`Scored ${pct} percent, ${score} of ${total} correct`}>
            <span className="stamp-pct">{pct}%</span>
            <span className="stamp-sub">
              {score} of {total}
            </span>
          </div>
        </div>

        <ol className="grid">
          {results.map((r, i) => (
            <li key={r.question.id} className={r.right ? "is-right" : "is-wrong"}>
              {i + 1}
              <span className="sr-only">{r.right ? " correct" : " wrong"}</span>
            </li>
          ))}
        </ol>

        <div className="actions">
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => start(missed, settings)}
            disabled={missed.length === 0}
          >
            Retry the {missed.length} I missed
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => start(questions, settings)}>
            Run it again
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => setPhase("ready")}>
            Change settings
          </button>
          {onLeave ? (
            <button className="btn btn-quiet" type="button" onClick={onLeave}>
              {leaveLabel ?? "Back"}
            </button>
          ) : null}
        </div>

        <p className="rubric review-head">Review</p>
        <ol className="review">
          {results.map((r, i) => (
            <li key={r.question.id} className={`review-item ${r.right ? "is-right" : "is-wrong"}`}>
              <span className="review-mark" aria-hidden="true">
                {r.right ? "✓" : "✗"}
              </span>
              <div>
                <p className="review-q">
                  <span className="sr-only">{r.right ? "Correct. " : "Wrong. "}</span>
                  {i + 1}. <TeX>{r.question.text}</TeX>
                </p>
                <dl className="review-rows">
                  <div className="review-row row-yours">
                    <dt>You marked</dt>
                    <dd>
                      <TeXList texts={pickedTexts(r.question, r.picked)} empty="Nothing marked" />
                    </dd>
                  </div>
                  {!r.right ? (
                    <div className="review-row row-right">
                      <dt>Answer</dt>
                      <dd>
                        <TeXList texts={correctTexts(r.question)} empty="None" />
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {r.question.note ? (
                  <p className="review-note">
                    <TeX>{r.question.note}</TeX>
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </>
    );
  }

  /* ---------------- running ---------------- */

  if (!current) return null;

  const picked = picks[current.id] ?? [];
  const isRevealed = Boolean(revealed[current.id]);
  const isLast = index === deck.length - 1;

  let nextLabel: string;
  if (settings.mode === "reviewer" && !isRevealed) {
    nextLabel = picked.length ? "Check answer" : "Skip";
  } else if (isLast) {
    nextLabel = settings.mode === "test" ? "Finish and grade" : "See results";
  } else {
    nextLabel = "Next question";
  }

  return (
    <>
      <div className="drill-bar">
        <p className="drill-count rubric" aria-live="polite">
          Question {index + 1} of {deck.length}
        </p>
        <ol className="track" aria-hidden="true">
          {deck.map((q, i) => {
            const classes: string[] = [];
            if (revealed[q.id]) classes.push(isRight(q, picks[q.id] ?? []) ? "is-right" : "is-wrong");
            else if ((picks[q.id] ?? []).length) classes.push("is-answered");
            if (i === index) classes.push("is-current");
            return <li key={q.id} className={classes.join(" ")} />;
          })}
        </ol>
        <p className="drill-mode rubric">{settings.mode === "test" ? "Test" : "Reviewer"}</p>
        <button className="link-btn link-btn-warn" type="button" onClick={() => setPhase("ready")}>
          End drill
        </button>
      </div>

      <div className="qcard">
        <p className="qtype rubric">{current.multi ? "Pick all that apply" : "Pick one"}</p>

        <h1 className="qtext">
          <span className="qnum">{String(index + 1).padStart(2, "0")}</span>
          <TeX>{current.text}</TeX>
        </h1>

        <div className="opts" role="group" aria-label={current.multi ? "Pick all that apply" : "Pick one"}>
          {current.options.map((option, i) => {
            const chosen = picked.includes(option.id);
            const classes = ["opt"];
            if (current.multi) classes.push("opt-multi");
            if (isRevealed) {
              classes.push("is-locked");
              if (option.correct) classes.push("is-correct");
              else if (chosen) classes.push("is-wrongpick");
            }

            let verdict = "";
            if (isRevealed) {
              if (option.correct && chosen) verdict = "✓ Correct";
              else if (option.correct) verdict = "✓ Answer";
              else if (chosen) verdict = "✗ Wrong";
            }

            return (
              <label key={option.id} className={classes.join(" ")}>
                <input
                  type={current.multi ? "checkbox" : "radio"}
                  name={`q-${current.id}`}
                  checked={chosen}
                  disabled={isRevealed}
                  onChange={() => togglePick(option.id)}
                />
                <span className="bubble" aria-hidden="true">
                  <span className="bubble-fill" />
                </span>
                <span className="opt-key" aria-hidden="true">
                  {LETTERS[i] ?? "•"}
                </span>
                <span className="opt-text">
                  <TeX>{option.text}</TeX>
                </span>
                <span className="opt-verdict">{verdict}</span>
              </label>
            );
          })}
        </div>

        {isRevealed && current.note ? (
          <p className="note">
            <TeX>{current.note}</TeX>
          </p>
        ) : null}
      </div>

      <div className="actions">
        <button
          className="btn btn-quiet"
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Back
        </button>
        <button className="btn btn-primary" type="button" onClick={advance}>
          {nextLabel}
        </button>
      </div>

      <p className="keyhint">
        Press <kbd>A</kbd>–<kbd>{LETTERS[Math.max(0, current.options.length - 1)]}</kbd> or{" "}
        <kbd>1</kbd>–<kbd>{Math.min(9, current.options.length)}</kbd> to mark an answer.{" "}
        <kbd>Enter</kbd> to continue.
      </p>
    </>
  );
}
