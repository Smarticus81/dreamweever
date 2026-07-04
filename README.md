# Dreamweever

A frictionless dream journal. You wake up groggy at 6 AM with a dream evaporating from memory — Dreamweever is built so that capturing it costs **two actions**: type, save. Everything else is derived, deferred, or optional.

> This repository was bootstrapped from empty. The product concept (dream journal) was inferred from the repo name; the architecture is a dependency-free static web app so it runs anywhere (open `index.html`, or serve the folder) and deploys to any static host.

## Running it

No build step, no dependencies.

```sh
# open directly
open index.html

# or serve (recommended, keeps module imports happy in all browsers)
npx serve .
```

Tests (pure logic only, via Node's built-in test runner):

```sh
npm test
```

## Workflow design

Every flow was designed on paper first, optimizing for step count, cognitive load, and error recovery.

### Capture (the core job) — 2 actions, 1 screen, 0 required fields

1. Open the app → the composer is **already focused**. Zero clicks to start typing.
2. Type the dream. Tags are inline `#hashtags`; the title is derived from the first line. The app never asks for information the text already contains.
3. `Ctrl/Cmd + Enter` (or one click) saves. Focus returns to the composer, ready for the next entry.

### Recall — 1 action

- Type in the search box (`/` focuses it from anywhere) for a live filter across text and tags, or click any tag chip. `Escape` clears.

### Edit / delete

- **Edit**: one click loads the entry into the composer. `Escape` cancels. If you had an unsaved draft when you started editing, it is stashed and restored afterwards — editing never destroys in-progress work.
- **Delete**: instant, with an 8-second **Undo** toast. Recoverable-by-default beats a blocking confirm dialog.

### Unhappy paths (designed, not accidental)

| Scenario | Behavior |
|---|---|
| Refresh / crash / back button mid-entry | Draft autosaves on every keystroke and is restored on load, with a notice. |
| Delete by mistake | Undo toast, 8 seconds, keyboard accessible. |
| `localStorage` unavailable or full | Visible banner; the session keeps working in memory so typed text is never silently lost. |
| No entries yet | Empty state explains the app and points at the (already focused) composer. |
| Search with no matches | Explains what was searched and offers one-click clear. |
| Double-submit | Saving is guarded; empty entries are refused with inline feedback, not an alert. |
| Data lock-in | One-click JSON export. |

### Accessibility as workflow

Semantic landmarks, labeled controls, full keyboard operation (`Ctrl/Cmd+Enter` save, `Escape` cancel/clear, `/` to search), `aria-live` announcements for save/delete/undo, and visible focus states.

## Structure

```
index.html      — single screen, semantic markup
css/styles.css  — dark-first (it's a dream journal), respects prefers-color-scheme
js/lib.js       — pure logic: title/tag derivation, search matching (tested)
js/store.js     — persistence: entries + draft in localStorage, failure-tolerant
js/app.js       — UI wiring, focus management, toasts
test/lib.test.mjs — Node test-runner tests for the pure logic
```

Data stays on the device. There is no server.
