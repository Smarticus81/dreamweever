// Pure logic for Dreamweever. No DOM, no storage — everything here is testable.

const MAX_TITLE_LENGTH = 80;

/**
 * Derive a title from the entry text: the first non-empty line,
 * with inline #tag markers kept readable, capped for display.
 */
export function deriveTitle(text) {
  const firstLine = (text || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Untitled dream";
  if (firstLine.length <= MAX_TITLE_LENGTH) return firstLine;
  return firstLine.slice(0, MAX_TITLE_LENGTH - 1).trimEnd() + "…";
}

/**
 * The text to display under the title. The first line already appears as
 * the derived title, so repeating it in the body is pure noise — strip it,
 * unless the title was truncated (then the full text stays visible).
 */
export function deriveBody(text) {
  const trimmed = (text || "").trim();
  const newlineIndex = trimmed.indexOf("\n");
  const firstLine = newlineIndex === -1 ? trimmed : trimmed.slice(0, newlineIndex);
  if (firstLine.length > MAX_TITLE_LENGTH) return trimmed;
  return newlineIndex === -1 ? "" : trimmed.slice(newlineIndex + 1).trim();
}

/**
 * Extract unique, lowercased inline #tags from the text.
 * Supports unicode letters, digits, underscore and hyphen.
 */
export function extractTags(text) {
  const matches = (text || "").matchAll(/#([\p{L}\p{N}_-]+)/gu);
  const tags = new Set();
  for (const match of matches) tags.add(match[1].toLowerCase());
  return [...tags].sort();
}

/**
 * Live-search predicate. A query starting with "#" matches tags only
 * (prefix match, so "#fly" finds "#flying"); anything else is a
 * case-insensitive substring match on the full text.
 */
export function matchesQuery(entry, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  if (q.startsWith("#")) {
    const tagQuery = q.slice(1);
    if (!tagQuery) return true;
    return entry.tags.some((tag) => tag.startsWith(tagQuery));
  }
  return entry.text.toLowerCase().includes(q);
}

/** Collect all tags across entries with usage counts, most-used first. */
export function tagCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    for (const tag of entry.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

/** Build a new entry object from raw text. */
export function makeEntry(text, now = Date.now(), id = cryptoRandomId()) {
  const trimmed = (text || "").trim();
  return {
    id,
    text: trimmed,
    title: deriveTitle(trimmed),
    tags: extractTags(trimmed),
    createdAt: now,
    updatedAt: now,
  };
}

/** Apply new text to an existing entry, re-deriving title and tags. */
export function updateEntry(entry, text, now = Date.now()) {
  const trimmed = (text || "").trim();
  return {
    ...entry,
    text: trimmed,
    title: deriveTitle(trimmed),
    tags: extractTags(trimmed),
    updatedAt: now,
  };
}

function cryptoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Human date for the entry list: "Today · 6:12 AM", "Yesterday · 11:40 PM",
 * otherwise "Mar 3, 2026 · 6:12 AM". Dreams are recalled by when you woke,
 * so recency labels carry more meaning than absolute dates.
 */
export function formatEntryDate(timestamp, now = Date.now(), locale = undefined) {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const startOfDay = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const dayDiff = Math.round((startOfDay(now) - startOfDay(timestamp)) / 86_400_000);
  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Yesterday · ${time}`;
  const day = date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
  return `${day} · ${time}`;
}
