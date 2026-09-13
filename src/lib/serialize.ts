/**
 * The inverse of parseSheet.
 *
 * The builder and the text box are two views of one sheet, and this is what
 * keeps them honest: the builder never holds a private format, it just writes
 * the same text you would have typed.
 */

export type SerializableOption = {
  text: string;
  correct: boolean;
};

export type SerializableQuestion = {
  text: string;
  options: SerializableOption[];
  /** Present on a typed question, where it replaces the options entirely. */
  accept?: string[];
  note?: string;
};

/** A card the author has not touched yet is not a question, it is furniture. */
const isBlank = (question: SerializableQuestion) =>
  !question.text.trim() &&
  !(question.note ?? "").trim() &&
  (question.accept ?? []).every((answer) => !answer.trim()) &&
  question.options.every((option) => !option.text.trim());

export function serializeSheet(questions: SerializableQuestion[]): string {
  const written = questions.filter((question) => !isBlank(question));
  if (written.length === 0) return "";

  const blocks = written.map((question) => {
    const lines = [`Q: ${question.text.trim()}`];

    const accepted = (question.accept ?? []).map((answer) => answer.trim()).filter(Boolean);

    if (accepted.length > 0) {
      // A typed question carries no options, so writing both would produce a
      // sheet the parser rejects for mixing the two kinds.
      for (const answer of accepted) lines.push(`= ${answer}`);
    } else {
      for (const option of question.options) {
        const text = option.text.trim();
        // A half-typed answer row is not written out. The readout will still
        // say the question needs two answers, which is the message that helps.
        if (!text) continue;
        lines.push(`${option.correct ? "*" : "-"} ${text}`);
      }
    }

    for (const line of (question.note ?? "").split("\n")) {
      const note = line.trim();
      if (note) lines.push(`> ${note}`);
    }

    return lines.join("\n");
  });

  return `${blocks.join("\n\n")}\n`;
}

/** Comment lines survive the text box but not a round trip through the builder. */
export function countComments(source: string): number {
  return source.split(/\r\n|\r|\n/).filter((line) => /^[ \t]*#/.test(line)).length;
}
