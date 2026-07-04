import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveTitle,
  deriveBody,
  extractTags,
  matchesQuery,
  tagCounts,
  makeEntry,
  updateEntry,
  formatEntryDate,
} from "../js/lib.js";

test("deriveTitle uses first non-empty line", () => {
  assert.equal(deriveTitle("\n\n  Flying over the sea\nmore detail"), "Flying over the sea");
});

test("deriveTitle handles empty text", () => {
  assert.equal(deriveTitle(""), "Untitled dream");
  assert.equal(deriveTitle("   \n  "), "Untitled dream");
});

test("deriveTitle caps long lines with ellipsis", () => {
  const title = deriveTitle("x".repeat(200));
  assert.ok(title.length <= 80);
  assert.ok(title.endsWith("…"));
});

test("deriveBody strips the title line", () => {
  assert.equal(deriveBody("Flying high\nover the sea"), "over the sea");
});

test("deriveBody is empty for single-line entries", () => {
  assert.equal(deriveBody("Just one line"), "");
});

test("deriveBody keeps full text when title was truncated", () => {
  const longLine = "x".repeat(200);
  assert.equal(deriveBody(`${longLine}\nsecond line`), `${longLine}\nsecond line`);
});

test("extractTags finds unique lowercase tags, sorted", () => {
  assert.deepEqual(
    extractTags("I was #Flying over #water, then #flying again #déjà-vu"),
    ["déjà-vu", "flying", "water"],
  );
});

test("extractTags returns empty for no tags", () => {
  assert.deepEqual(extractTags("no tags here"), []);
});

test("matchesQuery: empty query matches everything", () => {
  const entry = makeEntry("some dream #a");
  assert.equal(matchesQuery(entry, ""), true);
  assert.equal(matchesQuery(entry, "   "), true);
});

test("matchesQuery: plain query is case-insensitive substring", () => {
  const entry = makeEntry("Chasing a TRAIN through fog");
  assert.equal(matchesQuery(entry, "train"), true);
  assert.equal(matchesQuery(entry, "boat"), false);
});

test("matchesQuery: #query prefix-matches tags only", () => {
  const entry = makeEntry("dream about flying #flying");
  assert.equal(matchesQuery(entry, "#fly"), true);
  assert.equal(matchesQuery(entry, "#water"), false);
  // '#' alone matches everything (query in progress)
  assert.equal(matchesQuery(entry, "#"), true);
});

test("tagCounts sorts by usage then name", () => {
  const entries = [makeEntry("#b #a"), makeEntry("#b"), makeEntry("#c")];
  assert.deepEqual(tagCounts(entries), [
    { tag: "b", count: 2 },
    { tag: "a", count: 1 },
    { tag: "c", count: 1 },
  ]);
});

test("makeEntry derives title and tags and trims text", () => {
  const entry = makeEntry("  Falling #falling\ninto water  ", 1000, "fixed-id");
  assert.equal(entry.id, "fixed-id");
  assert.equal(entry.text, "Falling #falling\ninto water");
  assert.equal(entry.title, "Falling #falling");
  assert.deepEqual(entry.tags, ["falling"]);
  assert.equal(entry.createdAt, 1000);
  assert.equal(entry.updatedAt, 1000);
});

test("updateEntry re-derives title/tags and preserves createdAt", () => {
  const entry = makeEntry("old #old", 1000, "id1");
  const updated = updateEntry(entry, "new title #new", 2000);
  assert.equal(updated.id, "id1");
  assert.equal(updated.createdAt, 1000);
  assert.equal(updated.updatedAt, 2000);
  assert.equal(updated.title, "new title #new");
  assert.deepEqual(updated.tags, ["new"]);
});

test("formatEntryDate labels today and yesterday", () => {
  const now = new Date("2026-07-04T09:00:00").getTime();
  const today = new Date("2026-07-04T06:12:00").getTime();
  const yesterday = new Date("2026-07-03T23:40:00").getTime();
  const older = new Date("2026-03-03T06:12:00").getTime();
  assert.ok(formatEntryDate(today, now).startsWith("Today ·"));
  assert.ok(formatEntryDate(yesterday, now).startsWith("Yesterday ·"));
  assert.ok(formatEntryDate(older, now).includes("2026"));
});
