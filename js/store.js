// Persistence for Dreamweever: entries + composer draft in localStorage.
// Failure-tolerant by design — if storage is unavailable, the app keeps
// working in memory and the UI is told so it can warn the user.

const ENTRIES_KEY = "dreamweever.entries.v1";
const DRAFT_KEY = "dreamweever.draft.v1";

export function createStore() {
  let storageOk = true;
  let memoryEntries = [];
  let memoryDraft = "";

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      storageOk = false;
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      storageOk = false;
      return false;
    }
  };

  memoryEntries = sanitizeEntries(read(ENTRIES_KEY, []));
  memoryDraft = typeof read(DRAFT_KEY, "") === "string" ? read(DRAFT_KEY, "") : "";

  return {
    /** False once any storage operation has failed; UI shows a warning banner. */
    get healthy() {
      return storageOk;
    },

    /** Entries, newest first. Always served from memory; storage is a mirror. */
    getEntries() {
      return [...memoryEntries];
    },

    saveEntries(entries) {
      memoryEntries = [...entries];
      return write(ENTRIES_KEY, memoryEntries);
    },

    getDraft() {
      return memoryDraft;
    },

    saveDraft(text) {
      memoryDraft = text;
      if (text) return write(DRAFT_KEY, text);
      try {
        localStorage.removeItem(DRAFT_KEY);
        return true;
      } catch {
        storageOk = false;
        return false;
      }
    },
  };
}

function sanitizeEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e) =>
      e &&
      typeof e.id === "string" &&
      typeof e.text === "string" &&
      typeof e.createdAt === "number" &&
      Array.isArray(e.tags),
  );
}
