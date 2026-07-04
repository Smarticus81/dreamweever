import {
  makeEntry,
  updateEntry,
  matchesQuery,
  tagCounts,
  formatEntryDate,
  deriveBody,
} from "./lib.js";
import { createStore } from "./store.js";

const store = createStore();

const el = {
  textarea: document.getElementById("dream-text"),
  saveBtn: document.getElementById("save-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  composerMode: document.getElementById("composer-mode"),
  composerError: document.getElementById("composer-error"),
  draftNotice: document.getElementById("draft-notice"),
  search: document.getElementById("search"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  tagBar: document.getElementById("tag-bar"),
  entries: document.getElementById("entries"),
  emptyState: document.getElementById("empty-state"),
  noResults: document.getElementById("no-results"),
  noResultsText: document.getElementById("no-results-text"),
  storageBanner: document.getElementById("storage-banner"),
  exportBtn: document.getElementById("export-btn"),
  toastRegion: document.getElementById("toast-region"),
  entryTemplate: document.getElementById("entry-template"),
};

let entries = store.getEntries().sort((a, b) => b.createdAt - a.createdAt);
let editingId = null; // id of the entry loaded into the composer, or null
let stashedDraft = null; // in-progress new-dream text stashed while editing

// ---------- Rendering ----------

function render() {
  const query = el.search.value;
  const visible = entries.filter((entry) => matchesQuery(entry, query));

  el.entries.replaceChildren(...visible.map(renderEntry));

  el.emptyState.hidden = !(entries.length === 0);
  const searching = query.trim().length > 0;
  el.noResults.hidden = !(entries.length > 0 && visible.length === 0);
  if (!el.noResults.hidden) {
    el.noResultsText.textContent = `No dreams match “${query.trim()}”.`;
  }

  renderTagBar(searching ? query.trim().toLowerCase() : "");
  checkStorageHealth();
}

function renderEntry(entry) {
  const node = el.entryTemplate.content.cloneNode(true);
  const li = node.querySelector(".entry");
  li.dataset.id = entry.id;
  node.querySelector(".entry-title").textContent = entry.title;
  const time = node.querySelector(".entry-date");
  time.dateTime = new Date(entry.createdAt).toISOString();
  time.textContent = formatEntryDate(entry.createdAt);
  const body = deriveBody(entry.text);
  const textEl = node.querySelector(".entry-text");
  textEl.textContent = body;
  textEl.hidden = body === "";

  const tagsEl = node.querySelector(".entry-tags");
  tagsEl.replaceChildren(
    ...entry.tags.map((tag) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tag";
      btn.textContent = `#${tag}`;
      btn.addEventListener("click", () => setSearch(`#${tag}`));
      return btn;
    }),
  );
  return node;
}

function renderTagBar(activeQuery) {
  const counts = tagCounts(entries).slice(0, 12);
  el.tagBar.replaceChildren(
    ...counts.map(({ tag, count }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = activeQuery === `#${tag}`;
      btn.className = active ? "tag tag-active" : "tag";
      btn.setAttribute("aria-pressed", String(active));
      btn.textContent = `#${tag} (${count})`;
      btn.addEventListener("click", () => setSearch(active ? "" : `#${tag}`));
      return btn;
    }),
  );
}

function setSearch(value) {
  el.search.value = value;
  render();
}

function checkStorageHealth() {
  el.storageBanner.hidden = store.healthy;
}

// ---------- Composer: draft, save, edit ----------

function persistEntries() {
  store.saveEntries(entries);
  checkStorageHealth();
}

function showComposerError(message) {
  el.composerError.textContent = message;
}

function saveComposer() {
  const text = el.textarea.value.trim();
  if (!text) {
    showComposerError("Nothing to save yet — describe the dream first.");
    el.textarea.focus();
    return;
  }

  if (editingId) {
    const index = entries.findIndex((e) => e.id === editingId);
    if (index !== -1) entries[index] = updateEntry(entries[index], text);
    exitEditMode();
    toast("Dream updated.");
  } else {
    entries.unshift(makeEntry(text));
    el.textarea.value = "";
    store.saveDraft("");
    toast("Dream saved.");
  }

  persistEntries();
  showComposerError("");
  el.draftNotice.hidden = true;
  render();
  el.textarea.focus();
}

function enterEditMode(entry) {
  if (editingId === null) stashedDraft = el.textarea.value;
  editingId = entry.id;
  el.textarea.value = entry.text;
  el.composerMode.hidden = false;
  el.cancelEditBtn.hidden = false;
  el.saveBtn.textContent = "Save changes";
  el.draftNotice.hidden = true;
  showComposerError("");
  el.textarea.focus();
  el.textarea.setSelectionRange(el.textarea.value.length, el.textarea.value.length);
}

function exitEditMode() {
  editingId = null;
  el.textarea.value = stashedDraft ?? "";
  stashedDraft = null;
  el.composerMode.hidden = true;
  el.cancelEditBtn.hidden = true;
  el.saveBtn.textContent = "Save dream";
  showComposerError("");
}

function cancelEdit() {
  exitEditMode();
  el.textarea.focus();
}

// ---------- Delete with undo ----------

function deleteEntry(id) {
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) return;
  const [removed] = entries.splice(index, 1);
  if (editingId === id) exitEditMode();
  persistEntries();
  render();
  toast(`Deleted “${removed.title}”.`, {
    actionLabel: "Undo",
    duration: 8000,
    onAction() {
      entries.splice(Math.min(index, entries.length), 0, removed);
      persistEntries();
      render();
    },
  });
}

// ---------- Toasts ----------

function toast(message, { actionLabel, onAction, duration = 2500 } = {}) {
  const node = document.createElement("div");
  node.className = "toast";
  const text = document.createElement("span");
  text.textContent = message;
  node.append(text);

  const dismiss = () => {
    clearTimeout(timer);
    node.remove();
  };
  const timer = setTimeout(dismiss, duration);

  if (actionLabel && onAction) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm toast-action";
    btn.textContent = actionLabel;
    btn.addEventListener("click", () => {
      dismiss();
      onAction();
    });
    node.append(btn);
  }

  el.toastRegion.append(node);
}

// ---------- Export ----------

function exportJson() {
  if (entries.length === 0) {
    toast("Nothing to export yet.");
    return;
  }
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dreamweever-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${entries.length} dream${entries.length === 1 ? "" : "s"}.`);
}

// ---------- Wiring ----------

el.textarea.addEventListener("input", () => {
  showComposerError("");
  el.draftNotice.hidden = true;
  if (!editingId) {
    store.saveDraft(el.textarea.value);
    checkStorageHealth();
  }
});

el.textarea.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    saveComposer();
  } else if (event.key === "Escape" && editingId) {
    event.preventDefault();
    cancelEdit();
  }
});

el.saveBtn.addEventListener("click", saveComposer);
el.cancelEditBtn.addEventListener("click", cancelEdit);
el.exportBtn.addEventListener("click", exportJson);

el.search.addEventListener("input", render);
el.search.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && el.search.value) {
    event.stopPropagation();
    setSearch("");
  }
});
el.clearSearchBtn.addEventListener("click", () => {
  setSearch("");
  el.search.focus();
});

el.entries.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.closest(".entry")?.dataset.id;
  const entry = entries.find((e) => e.id === id);
  if (!entry) return;
  if (button.dataset.action === "edit") enterEditMode(entry);
  if (button.dataset.action === "delete") deleteEntry(id);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "/") return;
  const target = event.target;
  const typing =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  if (typing) return;
  event.preventDefault();
  el.search.focus();
  el.search.select();
});

// ---------- Init ----------

const draft = store.getDraft();
if (draft) {
  el.textarea.value = draft;
  el.draftNotice.hidden = false;
  el.textarea.setSelectionRange(draft.length, draft.length);
}
render();
el.textarea.focus();
