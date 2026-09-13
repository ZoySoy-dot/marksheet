"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QuestionBuilder from "@/components/QuestionBuilder";
import MathKeyboard from "@/components/MathKeyboard";
import MathKeyboardToggle from "@/components/MathKeyboardToggle";
import QuizRunner from "@/components/QuizRunner";
import SourceUpload from "@/components/SourceUpload";
import { countComments, serializeSheet } from "@/lib/serialize";
import { parseSheet, suggestTitle } from "@/lib/parse";
import { findTexProblems } from "@/lib/tex";
import { SAMPLE_SOURCE, SAMPLE_TITLE } from "@/lib/sample";
import { forgetSheet, rememberSheet } from "@/lib/mine";

const DRAFT_KEY = "marksheet.draft";
const PROBLEMS_SHOWN = 8;

type Props = {
  mode: "create" | "edit";
  slug?: string;
  editToken?: string;
  initialTitle?: string;
  initialSource?: string;
};

type Published = { slug: string; url: string; owned: boolean };

type InputMode = "build" | "paste" | "upload";

const INPUT_MODES: { id: InputMode; label: string }[] = [
  { id: "build", label: "Build it here" },
  { id: "paste", label: "Paste text" },
  { id: "upload", label: "Upload a file" },
];

export default function Composer({ mode, slug, editToken, initialTitle, initialSource }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [source, setSource] = useState(initialSource ?? "");
  const [practising, setPractising] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [published, setPublished] = useState<Published | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("build");
  // Bumping this remounts the builder, which re-seeds it from the current text.
  const [buildSeed, setBuildSeed] = useState(0);
  const [droppedComments, setDroppedComments] = useState(0);
  const [loadedFile, setLoadedFile] = useState<string | null>(null);
  const urlField = useRef<HTMLInputElement>(null);

  // Broken LaTeX is reported the same way a malformed line is: by line number,
  // and it blocks publishing.
  const { questions, problems, multiCount } = useMemo(() => {
    const parsed = parseSheet(source);
    const merged = [...parsed.problems, ...findTexProblems(source)].sort((a, b) => a.line - b.line);
    return { ...parsed, problems: merged };
  }, [source]);
  const ready = questions.length > 0 && problems.length === 0;
  const effectiveTitle = title.trim() || suggestTitle(questions);

  // Keep a draft so a closed tab at 1am does not cost you the whole sheet.
  useEffect(() => {
    if (mode !== "create") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: string; source?: string };
      if (draft.source) setSource(draft.source);
      if (draft.title) setTitle(draft.title);
    } catch {
      /* no draft to restore */
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "create") return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, source }));
      } catch {
        /* nothing to do */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [mode, title, source]);

  useEffect(() => {
    setSaved(false);
  }, [title, source]);

  const switchMode = (next: InputMode) => {
    setLoadedFile(null);
    if (next === "build") {
      // The builder can hold everything the format carries except comments,
      // so say so up front rather than losing them quietly.
      setDroppedComments(countComments(source));
      setBuildSeed((n) => n + 1);
    } else {
      setDroppedComments(0);
    }
    setInputMode(next);
  };

  const loadSample = () => {
    setSource(SAMPLE_SOURCE);
    setTitle(SAMPLE_TITLE);
    setPublished(null);
    setError(null);
    setLoadedFile(null);
    setBuildSeed((n) => n + 1);
    setDroppedComments(inputMode === "build" ? countComments(SAMPLE_SOURCE) : 0);
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: effectiveTitle, source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not publish this sheet.");

      rememberSheet({
        slug: data.slug,
        title: data.title,
        editToken: data.editToken,
        questionCount: data.questionCount,
        createdAt: new Date().toISOString(),
      });
      setPublished({
        slug: data.slug,
        url: `${window.location.origin}/q/${data.slug}`,
        owned: Boolean(data.owned),
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* nothing to do */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish this sheet.");
    } finally {
      setBusy(false);
    }
  };

  const saveChanges = async () => {
    if (!slug || !editToken) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quizzes/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editToken, title: effectiveTitle, source }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save your changes.");
      rememberSheet({
        slug,
        title: data.title,
        editToken,
        questionCount: data.questionCount,
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your changes.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!slug || !editToken) return;
    if (!window.confirm("Delete this quiz? The share link stops working for everyone.")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quizzes/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editToken }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not delete this sheet.");
      }
      forgetSheet(slug);
      router.push("/quizzes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this sheet.");
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(published.url);
    } catch {
      urlField.current?.select();
    }
  };

  if (practising) {
    return (
      <div className="screen screen-narrow">
        <QuizRunner
          title={effectiveTitle}
          questions={questions}
          onLeave={() => setPractising(false)}
          leaveLabel="Back to editing"
        />
      </div>
    );
  }

  return (
    <div className="screen screen-narrow">
      <h1 className="display display-md">{mode === "edit" ? "Edit quiz" : "New quiz"}</h1>

      <div className="editor-form" data-math-target>
        <div className="field-block">
          <label className="rubric" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            className="title-input"
            type="text"
            value={title}
            maxLength={140}
            placeholder="Systems midterm"
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div className="field-head">
          <p className="rubric">Questions</p>
          <span className="field-head-links">
            <Link className="link-btn" href="/ai">
              Use AI
            </Link>
            <button className="link-btn" type="button" onClick={loadSample}>
              Load a sample
            </button>
          </span>
        </div>

        <div className="editor-tools">
          <div className="seg" role="tablist" aria-label="How to write this quiz">
            {INPUT_MODES.map((option) => (
              <button
                key={option.id}
                className={`seg-btn${inputMode === option.id ? " is-picked" : ""}`}
                type="button"
                role="tab"
                aria-selected={inputMode === option.id}
                onClick={() => switchMode(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {inputMode === "paste" ? <MathKeyboard /> : null}
        </div>

        {loadedFile ? (
          <div className="banner banner-info">
            <p>Read {loadedFile}.</p>
          </div>
        ) : null}

        {inputMode === "build" ? (
          <>
            {droppedComments > 0 ? (
              <div className="banner banner-info">
                <p>
                  Editing here drops {droppedComments} comment line
                  {droppedComments === 1 ? "" : "s"}. Use Paste to keep{" "}
                  {droppedComments === 1 ? "it" : "them"}.
                </p>
              </div>
            ) : null}
            <QuestionBuilder
              key={buildSeed}
              initial={questions}
              onChange={(built) => setSource(serializeSheet(built))}
            />
            <MathKeyboardToggle />
          </>
        ) : null}

        {inputMode === "paste" ? (
          <>
            <textarea
              id="source"
              className="source"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={source}
              aria-describedby="readout"
              aria-label="Your questions as plain text"
              onChange={(event) => setSource(event.target.value)}
              placeholder={"Q: What is the capital of France?\n- London\n- Berlin\n* Paris"}
            />
            <details className="ref">
              <summary>Format reference</summary>
              <dl className="ref-list">
                <div><dt><code>Q:</code></dt><dd>starts a question</dd></div>
                <div><dt><code>*</code></dt><dd>correct answer</dd></div>
                <div><dt><code>-</code></dt><dd>wrong answer</dd></div>
                <div><dt><code>&gt;</code></dt><dd>note shown after they answer</dd></div>
                <div><dt><code>#</code></dt><dd>ignored</dd></div>
                <div><dt><code>$…$</code></dt><dd>maths, in LaTeX</dd></div>
              </dl>
              <p className="ref-note">
                Two or more <code>*</code> makes it pick-all-that-apply.
              </p>
            </details>
          </>
        ) : null}

        {inputMode === "upload" ? (
          <SourceUpload
            onLoaded={(text, filename) => {
              setSource(text);
              setLoadedFile(filename);
              setBuildSeed((n) => n + 1);
              setInputMode("paste");
            }}
          />
        ) : null}

        {source.trim().length === 0 ? (
          <div className="readout readout-start" id="readout" role="status" aria-live="polite">
            <p className="readout-lead">Nothing here yet</p>
            <p className="readout-sub">Start from a sample, or let a chatbot write one.</p>
            <div className="readout-actions">
              <button className="btn btn-quiet" type="button" onClick={loadSample}>
                Load a sample
              </button>
              <Link className="btn btn-quiet" href="/ai">
                Use AI
              </Link>
            </div>
          </div>
        ) : (
          <div className="readout" id="readout" role="status" aria-live="polite">
            <div className="readout-figures">
              <p className="figure">
                <span className="figure-num">{questions.length}</span>
                <span className="figure-label">questions</span>
              </p>
              <p className="figure">
                <span className="figure-num">{multiCount}</span>
                <span className="figure-label">pick all</span>
              </p>
              <p className={`figure${problems.length ? " is-flagged" : ""}`}>
                <span className="figure-num">{problems.length}</span>
                <span className="figure-label">problems</span>
              </p>
            </div>

            {problems.length ? (
              <ul className="problems">
                {problems.slice(0, PROBLEMS_SHOWN).map((problem) => (
                  <li key={`${problem.line}-${problem.message}`}>
                    Line {problem.line}: {problem.message}
                  </li>
                ))}
                {problems.length > PROBLEMS_SHOWN ? (
                  <li>And {problems.length - PROBLEMS_SHOWN} more.</li>
                ) : null}
              </ul>
            ) : (
              <p className="readout-ok">Ready to publish.</p>
            )}
          </div>
        )}

        <div className="actions">
          {mode === "create" ? (
            <button className="btn btn-primary" type="button" onClick={publish} disabled={!ready || busy}>
              {busy ? "Publishing…" : "Publish"}
            </button>
          ) : (
            <button className="btn btn-primary" type="button" onClick={saveChanges} disabled={!ready || busy}>
              {busy ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
          )}

          <button className="btn btn-quiet" type="button" onClick={() => setPractising(true)} disabled={!ready}>
            Try it
          </button>

          {mode === "edit" ? (
            <button className="btn btn-danger" type="button" onClick={remove} disabled={busy}>
              Delete
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="banner" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        {mode === "edit" && saved ? (
          <div className="banner banner-info">
            <p>
              Saved. <a href={`/q/${slug}`}>Open it</a>.
            </p>
          </div>
        ) : null}

        {published ? (
          <div className="share">
            <p className="rubric">Your link</p>
            <div className="share-url">
              <input
                ref={urlField}
                type="text"
                readOnly
                value={published.url}
                onFocus={(event) => event.target.select()}
              />
              <button className="btn btn-primary" type="button" onClick={copyLink}>
                Copy
              </button>
              <a className="btn btn-quiet" href={`/q/${published.slug}`}>
                Open
              </a>
            </div>
            <p className="share-note">
              {published.owned
                ? "Saved to your account. Edit it any time from Quizzes."
                : "The link works forever, but only this browser can edit it, and only for a few hours. Sign in and it moves to your account automatically."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
