"use client";

import { useEffect, useRef, useState } from "react";
import MathField from "@/components/MathField";
import type { Question } from "@/lib/parse";
import type { SerializableQuestion } from "@/lib/serialize";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MAX_OPTIONS = 26;

let seq = 0;
const nextId = () => `b${(seq += 1)}`;

type DraftOption = { id: string; text: string; correct: boolean };
type DraftAccept = { id: string; text: string };
type DraftQuestion = {
  id: string;
  kind: "choice" | "typed";
  text: string;
  note: string;
  options: DraftOption[];
  accept: DraftAccept[];
};

function blankQuestion(): DraftQuestion {
  return {
    id: nextId(),
    kind: "choice",
    text: "",
    note: "",
    // One answer starts marked, so a fresh question is already valid the
    // moment it has text in it.
    options: [
      { id: nextId(), text: "", correct: true },
      { id: nextId(), text: "", correct: false },
    ],
    accept: [{ id: nextId(), text: "" }],
  };
}

function seed(questions: Question[]): DraftQuestion[] {
  if (questions.length === 0) return [blankQuestion()];
  return questions.map((question) => {
    const typed = question.kind === "typed";
    return {
      id: nextId(),
      kind: typed ? ("typed" as const) : ("choice" as const),
      text: question.text,
      note: question.note ?? "",
      // Both sides are kept while editing, so switching kind by mistake does
      // not throw away what was already written.
      options: typed
        ? blankQuestion().options
        : question.options.map((option) => ({
            id: nextId(),
            text: option.text,
            correct: option.correct,
          })),
      accept: typed
        ? (question.accept ?? []).map((text) => ({ id: nextId(), text }))
        : [{ id: nextId(), text: "" }],
    };
  });
}

const toSerializable = (question: DraftQuestion): SerializableQuestion =>
  question.kind === "typed"
    ? {
        text: question.text,
        note: question.note,
        options: [],
        accept: question.accept.map((answer) => answer.text),
      }
    : {
        text: question.text,
        note: question.note,
        options: question.options.map(({ text, correct }) => ({ text, correct })),
      };

type Props = {
  /** Seeds the draft once, on mount. Remount with a key to re-seed. */
  initial: Question[];
  onChange: (questions: SerializableQuestion[]) => void;
};

export default function QuestionBuilder({ initial, onChange }: Props) {
  const [draft, setDraft] = useState<DraftQuestion[]>(() => seed(initial));

  // Keep the callback fresh without making it a dependency of the sync effect.
  const notify = useRef(onChange);
  useEffect(() => {
    notify.current = onChange;
  });
  useEffect(() => {
    notify.current(draft.map(toSerializable));
  }, [draft]);

  const patchQuestion = (id: string, patch: Partial<DraftQuestion>) =>
    setDraft((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const patchOption = (qid: string, oid: string, patch: Partial<DraftOption>) =>
    setDraft((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) }
          : q,
      ),
    );

  const patchAccept = (qid: string, aid: string, text: string) =>
    setDraft((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, accept: q.accept.map((a) => (a.id === aid ? { ...a, text } : a)) }
          : q,
      ),
    );

  const addQuestion = () => setDraft((prev) => [...prev, blankQuestion()]);

  const removeQuestion = (id: string) =>
    setDraft((prev) => {
      const next = prev.filter((q) => q.id !== id);
      return next.length ? next : [blankQuestion()];
    });

  const moveQuestion = (index: number, by: number) =>
    setDraft((prev) => {
      const target = index + by;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addOption = (qid: string) =>
    setDraft((prev) =>
      prev.map((q) =>
        q.id === qid && q.options.length < MAX_OPTIONS
          ? { ...q, options: [...q.options, { id: nextId(), text: "", correct: false }] }
          : q,
      ),
    );

  const removeOption = (qid: string, oid: string) =>
    setDraft((prev) =>
      prev.map((q) =>
        q.id === qid && q.options.length > 2
          ? { ...q, options: q.options.filter((o) => o.id !== oid) }
          : q,
      ),
    );

  const addAccept = (qid: string) =>
    setDraft((prev) =>
      prev.map((q) =>
        q.id === qid && q.accept.length < MAX_OPTIONS
          ? { ...q, accept: [...q.accept, { id: nextId(), text: "" }] }
          : q,
      ),
    );

  const removeAccept = (qid: string, aid: string) =>
    setDraft((prev) =>
      prev.map((q) =>
        q.id === qid && q.accept.length > 1
          ? { ...q, accept: q.accept.filter((a) => a.id !== aid) }
          : q,
      ),
    );

  return (
    <div className="builder">
      <ol className="builder-list">
        {draft.map((question, index) => {
          const typed = question.kind === "typed";
          const correctCount = question.options.filter((o) => o.correct).length;
          const multi = !typed && correctCount > 1;
          const rubric = typed ? "They type it" : multi ? "Pick all that apply" : "Pick one";

          return (
            <li key={question.id} className="qbuild">
              <div className="qbuild-head">
                <span className="qbuild-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="qtype rubric">{rubric}</span>
                <span className="qbuild-tools">
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move question ${index + 1} up`}
                  >
                    ↑
                  </button>
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === draft.length - 1}
                    aria-label={`Move question ${index + 1} down`}
                  >
                    ↓
                  </button>
                  <button
                    className="icon-btn icon-btn-warn"
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    aria-label={`Delete question ${index + 1}`}
                  >
                    ✕
                  </button>
                </span>
              </div>

              <input
                className="qbuild-q"
                type="text"
                value={question.text}
                placeholder="Type the question"
                aria-label={`Question ${index + 1}`}
                onChange={(event) => patchQuestion(question.id, { text: event.target.value })}
              />

              <div className="seg seg-kind" role="radiogroup" aria-label={`Answer style for question ${index + 1}`}>
                <label className={`seg-btn${typed ? "" : " is-picked"}`}>
                  <input
                    className="sr-only"
                    type="radio"
                    name={`kind-${question.id}`}
                    checked={!typed}
                    onChange={() => patchQuestion(question.id, { kind: "choice" })}
                  />
                  Choices
                </label>
                <label className={`seg-btn${typed ? " is-picked" : ""}`}>
                  <input
                    className="sr-only"
                    type="radio"
                    name={`kind-${question.id}`}
                    checked={typed}
                    onChange={() => patchQuestion(question.id, { kind: "typed" })}
                  />
                  Typed answer
                </label>
              </div>

              {typed ? (
                <>
                  <ul className="qbuild-opts">
                    {question.accept.map((answer, ai) => (
                      <li key={answer.id} className="qbuild-opt is-accept">
                        <span className="opt-key" aria-hidden="true">
                          =
                        </span>

                        <MathField
                          value={answer.text}
                          placeholder={ai === 0 ? "The answer they type" : "Another wording you accept"}
                          ariaLabel={`Accepted answer ${ai + 1} of question ${index + 1}`}
                          onChange={(text) => patchAccept(question.id, answer.id, text)}
                        />

                        <button
                          className="icon-btn"
                          type="button"
                          onClick={() => removeAccept(question.id, answer.id)}
                          disabled={question.accept.length <= 1}
                          aria-label={`Remove accepted answer ${ai + 1}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="qbuild-foot">
                    <button
                      className="link-btn"
                      type="button"
                      onClick={() => addAccept(question.id)}
                      disabled={question.accept.length >= MAX_OPTIONS}
                    >
                      Add another wording
                    </button>
                    <span className="qbuild-hint">
                      Capitals and spacing are forgiven. Anything else they might
                      reasonably write needs its own line.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <ul className="qbuild-opts">
                    {question.options.map((option, oi) => (
                      <li
                        key={option.id}
                        className={`qbuild-opt${option.correct ? " is-correct" : ""}${multi ? " is-multi" : ""}`}
                      >
                        <label className="qbuild-mark">
                          <input
                            type="checkbox"
                            checked={option.correct}
                            onChange={(event) =>
                              patchOption(question.id, option.id, { correct: event.target.checked })
                            }
                          />
                          <span className="bubble" aria-hidden="true">
                            <span className="bubble-fill" />
                          </span>
                          <span className="sr-only">
                            Mark answer {LETTERS[oi] ?? oi + 1} of question {index + 1} correct
                          </span>
                        </label>

                        <span className="opt-key" aria-hidden="true">
                          {LETTERS[oi] ?? "•"}
                        </span>

                        <MathField
                          value={option.text}
                          placeholder={`Answer ${LETTERS[oi] ?? oi + 1}`}
                          ariaLabel={`Answer ${LETTERS[oi] ?? oi + 1} of question ${index + 1}`}
                          onChange={(text) => patchOption(question.id, option.id, { text })}
                        />

                        <button
                          className="icon-btn"
                          type="button"
                          onClick={() => removeOption(question.id, option.id)}
                          disabled={question.options.length <= 2}
                          aria-label={`Remove answer ${LETTERS[oi] ?? oi + 1}`}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="qbuild-foot">
                    <button
                      className="link-btn"
                      type="button"
                      onClick={() => addOption(question.id)}
                      disabled={question.options.length >= MAX_OPTIONS}
                    >
                      Add answer
                    </button>
                  </div>
                </>
              )}

              {/* Several lines are fine: each one is written out as its own
                  "> " line and they come back joined. */}
              <textarea
                className="qbuild-note"
                rows={2}
                value={question.note}
                placeholder="Explanation, shown after they answer (optional)"
                aria-label={`Explanation for question ${index + 1}`}
                onChange={(event) => patchQuestion(question.id, { note: event.target.value })}
              />
            </li>
          );
        })}
      </ol>

      <button className="btn btn-quiet" type="button" onClick={addQuestion}>
        Add question
      </button>
    </div>
  );
}
