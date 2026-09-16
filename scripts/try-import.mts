/**
 * A smoke test for reading a real document, run by hand.
 *
 * This is not in `npm test` on purpose. It calls a model, which costs money,
 * needs a credential and takes a minute, and none of that belongs in a suite
 * that runs on every change. The unit tests cover the glue around the model.
 * This covers the only question they cannot: whether it actually reads a paper
 * correctly, and in particular whether it finds an answer key printed pages
 * away from the questions it answers.
 *
 *   npm run try:import -- path/to/paper.pdf            transcribe its questions
 *   npm run try:import -- notes.pdf --write 15        write 15 questions about it
 */

import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { generateText, Output } from "ai";
import {
  IMPORT_BRIEF,
  IMPORT_MODEL,
  ImportedSheet,
  importModel,
  toSerializable,
  writeBrief,
} from "../src/lib/importing.ts";
import { serializeSheet } from "../src/lib/serialize.ts";
import { parseSheet } from "../src/lib/parse.ts";

const args = process.argv.slice(2);
const path = args.find((a) => !a.startsWith("--"));
if (!path) {
  console.error("Usage: npm run try:import -- path/to/paper.pdf [--write [count]]");
  process.exit(1);
}

const writing = args.includes("--write");
const count = Number(args[args.indexOf("--write") + 1]) || 0;

const MEDIA: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const name = basename(path);
const mediaType = MEDIA[extname(path).toLowerCase()];

const model = IMPORT_MODEL;
const chosen = importModel();

console.log(
  `${writing ? "Writing questions from" : "Reading questions out of"} ${name} with ${model}` +
    `${typeof chosen === "string" ? " through the gateway" : " directly"}`,
);

const content = mediaType
  ? [{ type: "file" as const, mediaType, data: readFileSync(path), filename: name }]
  : [{ type: "text" as const, text: readFileSync(path, "utf8") }];

const started = Date.now();
const { output, usage } = await generateText({
  model: chosen,
  system: writing ? writeBrief(count) : IMPORT_BRIEF,
  output: Output.object({ schema: ImportedSheet }),
  messages: [
    {
      role: "user",
      content: [
        ...content,
        {
          type: "text" as const,
          text: writing
            ? `Write a quiz from the material in ${name}.`
            : `Transcribe the question bank in ${name}.`,
        },
      ],
    },
  ],
});

const kept = toSerializable(output);
const source = serializeSheet(kept);
const parsed = parseSheet(source);

console.log(`\ntook       ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`tokens     ${usage.inputTokens ?? "?"} in, ${usage.outputTokens ?? "?"} out`);
console.log(`title      ${JSON.stringify(output.title)}`);
console.log(`read       ${output.questions.length}`);
console.log(`kept       ${kept.length}`);
console.log(`dropped    ${output.questions.length - kept.length}  (unkeyed or malformed)`);
console.log(`typed      ${parsed.questions.filter((q) => q.kind === "typed").length}`);
console.log(`pick-all   ${parsed.multiCount}`);
console.log(`problems   ${parsed.problems.length}`);
if (parsed.problems.length) console.log(parsed.problems.slice(0, 10));

console.log(`\n${"=".repeat(60)}\n`);
console.log(source);
