import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { currentUserId } from "@/auth";
import { apiError } from "@/lib/api";
import { isMode } from "@/lib/importModes";
import {
  IMPORT_BRIEF,
  ImportedSheet,
  importModel,
  toSerializable,
  writeBrief,
} from "@/lib/importing";
import { parseSheet, suggestTitle } from "@/lib/parse";
import { serializeSheet } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** A scanned two hundred page reviewer is a slow read, and worth waiting for. */
export const maxDuration = 300;

/**
 * Reading a document costs real money, unlike every other route here, so it is
 * the one thing that asks who you are first. That is also the only abuse
 * control there is until quotas exist: an account is cheap to make but not
 * free, and it puts a name against the spend.
 */
const needsAccount = () =>
  NextResponse.json({ error: "Sign in to read a document." }, { status: 401 });

const MAX_BYTES = 20_000_000;

/**
 * What a model will read natively. Word documents are missing on purpose:
 * nothing here can open one, and failing with an explanation beats returning
 * an empty sheet from a file the model saw as noise.
 */
const READABLE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const AS_TEXT = /^text\//;

const bad = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  try {
    const userId = await currentUserId();
    if (!userId) return needsAccount();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return bad("That upload did not arrive in one piece. Try again.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) return bad("No file was attached.");
    if (file.size === 0) return bad(`${file.name} is empty.`);
    if (file.size > MAX_BYTES) {
      return bad(
        `${file.name} is ${Math.round(file.size / 1_000_000)} MB. The limit is ${MAX_BYTES / 1_000_000} MB.`,
      );
    }

    // "read" transcribes a paper that already holds questions. "write" composes
    // new ones from material that does not. They are different enough jobs that
    // guessing between them would sometimes silently do the wrong one, so the
    // person says which, and the default is the safer of the two.
    const mode = isMode(form.get("mode")) ? (form.get("mode") as string) : "read";
    const asked = Number(form.get("count"));
    const count = Number.isFinite(asked) && asked > 0 ? Math.min(asked, 50) : 0;

    const mediaType = file.type || "application/octet-stream";
    const readable = READABLE.has(mediaType);
    const textual = AS_TEXT.test(mediaType);
    if (!readable && !textual) {
      return bad(
        "That file cannot be read. Upload a PDF, a photo of the pages, or plain text. Export a Word document as PDF first.",
      );
    }

    // Text goes as text. It costs less than the same bytes as a file part, and
    // a model reading a string cannot misjudge the page layout of one.
    const content = textual
      ? [{ type: "text" as const, text: await file.text() }]
      : [
          {
            type: "file" as const,
            mediaType,
            data: new Uint8Array(await file.arrayBuffer()),
            filename: file.name,
          },
        ];

    let sheet: ImportedSheet;
    try {
      const { output } = await generateText({
        model: importModel(),
        system: mode === "write" ? writeBrief(count) : IMPORT_BRIEF,
        output: Output.object({ schema: ImportedSheet }),
        messages: [
          {
            role: "user",
            content: [
              ...content,
              {
                type: "text" as const,
                text:
                  mode === "write"
                    ? `Write a quiz from the material in ${file.name}.`
                    : `Transcribe the question bank in ${file.name}.`,
              },
            ],
          },
        ],
      });
      sheet = output;
    } catch (error) {
      // The commonest failures by far are a missing gateway credential and an
      // account with no card on file. Both are setup problems, and neither is
      // something the person uploading a paper can do anything about, so they
      // get told it is not their fault rather than shown a stack trace.
      const detail = error instanceof Error ? error.message : String(error);
      if (
        /api key|unauthor|forbidden|credential|oidc|credit card|verification|quota|billing/i.test(
          detail,
        )
      ) {
        console.error(error);
        return NextResponse.json(
          { error: "This Marksheet is not set up to read documents yet." },
          { status: 503 },
        );
      }
      throw error;
    }

    const questions = toSerializable(sheet);
    if (questions.length === 0) {
      return bad(
        mode === "write"
          ? "No questions could be written from that. It may be too short, or mostly pictures."
          : "No questions could be read out of that. If the answers are in a separate key, include those pages too.",
      );
    }

    const source = serializeSheet(questions);

    // The sheet the editor is about to receive has to be one the editor would
    // accept. Anything else is a bug here, not something to hand to a person.
    const parsed = parseSheet(source);
    if (parsed.problems.length > 0) {
      console.error("import produced an unparseable sheet", parsed.problems.slice(0, 5));
      return NextResponse.json(
        { error: "That document was read, but the result came out malformed." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      title:
        sheet.title.trim() ||
        suggestTitle(parsed.questions) ||
        file.name.replace(/\.[^.]+$/, ""),
      source,
      questionCount: parsed.questions.length,
      /** How many the model saw but would not vouch for, worth saying out loud. */
      skipped: Math.max(0, sheet.questions.length - questions.length),
    });
  } catch (error) {
    return apiError(error);
  }
}
