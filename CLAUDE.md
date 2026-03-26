# Notehty — Agent Implementation Guide

## Overview

Notehty is a personal productivity desktop app built on Tauri 2.0. Implement the full application
incrementally, verifying each phase before proceeding to the next.

### What Notehty Is
A personal assistant for everyday productivity. The user can take rich-text notes with embedded
free-form and structured drawings, manage work items in a Kanban board, and open any work item
as its own full notepad panel.

---

## Tech Stack

| Layer      | Technology                                                          |
|------------|---------------------------------------------------------------------|
| Desktop    | Tauri 2.0                                                           |
| Backend    | Rust                                                                |
| ORM        | Diesel 2 (SQLite, bundled via `libsqlite3-sys`)                     |
| Migrations | `diesel_migrations` (embedded, runs on startup)                     |
| Frontend   | React 19 + Vite                                                     |
| Styling    | UnoCSS (`@unocss/preset-wind`, Tailwind-compatible)                 |
| Icons      | `lucide-react`                                                      |
| Typography | Geist (self-hosted via `@fontsource/geist`)                         |
| Editor     | BlockSuite `@blocksuite/presets` (DocEditor + EdgelessEditor)       |
| DnD        | `@dnd-kit/core` + `@dnd-kit/sortable`                               |
| Sync       | `cr-sqlite` (CRDT extension for SQLite, loaded at runtime)          |
| API glue   | `@tauri-apps/api/core` (`invoke`)                                   |

---

## Domain

### Core Concept: Notepad = Content Model

A **Notepad** is the shared content model used by both the global scratch space and every
WorkItem. It is not a separate entity type — it is simply the rich content body that everything
composes.

A Notepad is a **BlockSuite document** rendered by `DocEditor`. The entire editing surface
is one continuous document — text, drawings, and diagrams are all first-class block types
within the same editor, flowing inline with each other.

BlockSuite handles all block types natively:

| Block type      | How inserted         | Description                                          |
|-----------------|----------------------|------------------------------------------------------|
| Paragraph/text  | Default              | Rich text with bold, italic, headings H1–H3, bullet lists, numbered lists, inline code |
| Freeform drawing| `/draw` slash command| Embedded canvas block using BlockSuite's built-in surface |
| Diagram (edgeless)| `/diagram` slash command | EdgelessEditor embedded inline as a block       |
| Divider, quote, code | slash commands  | Standard BlockSuite block types, available by default |

**Persistence:** BlockSuite documents are backed by Yjs CRDT state. The binary Yjs update
is serialized and stored in SQLite as a `BLOB` column on the `documents` table. On load,
the blob is deserialized back into the BlockSuite workspace.

```sql
CREATE TABLE documents (
  id        TEXT PRIMARY KEY,  -- 'global' for GlobalNotepad, work_item id for WorkItems
  yjs_state BLOB NOT NULL,     -- serialized Yjs doc state
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

This replaces the previous `blocks` table — BlockSuite owns the document model internally.
The Rust backend stores and retrieves opaque blobs; it does not parse block content.

New documents are initialized with an empty BlockSuite workspace doc on first access.

---

### Entities

#### GlobalNotepad
- Singleton — one row, fixed `id = 1`, created on first startup
- Contains an ordered list of blocks (see above)
- Blocks can be promoted to WorkItems (see Promotion)

#### WorkItem
- Has `title: String`
- Has `status: Enum(queue | priority | in_progress | done)`
- Has `is_focus: Boolean`
  - Only valid when `status = in_progress`
  - At most **one** WorkItem may have `is_focus = true` at any time (mutex enforced in backend)
  - Moving a WorkItem away from `in_progress` must atomically clear `is_focus`
  - Dragging a new item into the Focus sub-column when one already exists must atomically
    demote the current focus item to Parked (`in_progress`, `is_focus = false`), then promote
    the new one. The backend `set_focus` command handles this — the frontend never needs two calls.
- Has a Notepad body (same block model as GlobalNotepad) for its own rich content

#### Block
- Belongs to either a `GlobalNotepad` or a `WorkItem` (polymorphic via nullable FKs)
- Has `block_type: Enum(text | freeform | diagram)`
- Has `position: Integer` (ordering within parent)
- Has `content: Text` (JSON blob; schema depends on `block_type`)

---

### Block Content Schemas

Block content is owned entirely by BlockSuite — the Yjs CRDT state (a binary blob) is the
source of truth. The Rust backend treats it as an opaque `BLOB`; it does not parse individual
block types. All text, freeform drawing, and diagram content lives inside the BlockSuite
workspace doc serialized via `Y.encodeStateAsUpdate(doc.spaceDoc)`.

There are no separate per-block JSON schemas; BlockSuite manages the internal document model.

---



---

## Full-Text Search

SQLite FTS5 is a built-in virtual table extension — no additional dependencies.

### Indexing Strategy
- On every document save (`update_document` command), extract plain text from the Yjs snapshot
  and upsert into `fts_content`
- Plain text extraction: deserialize Yjs state → walk the block tree → concatenate text nodes
- Runs synchronously with the save in the Rust backend

### Tauri Commands

```rust
search(query: String) -> Result<Vec<SearchResult>>

pub struct SearchResult {
    pub doc_id: String,
    pub title: String,
    pub snippet: String,  // FTS5 snippet() output
}
```

### UI
- Search input in the sidebar header (always visible)
- Results appear as a floating list, grouped by type (Notepad / WorkItem)
- Clicking a result opens the document and scrolls to the relevant block

---

### Cloud Sync Architecture (Local-First)

Notehty is **local-first**: all reads and writes hit the local SQLite DB. Sync is an optional
transport layer on top, never in the critical path.

#### CR-SQLite

Load the `crsqlite` SQLite extension at connection time. This adds CRDT semantics to normal
tables — no schema changes required.

After loading the extension, register each synced table as a **conflict-free replicated relation**:

```sql
SELECT crsql_as_crr('work_items');
SELECT crsql_as_crr('blocks');
SELECT crsql_as_crr('global_notepad');
```

Run these once after migrations (idempotent).

#### How it works

- Every write produces a **changeset** — a diff of what changed since a given version
- Changesets are small, serializable blobs
- Merging changesets from another device is conflict-free by construction (last-write-wins per
  column, with logical clocks — not wall clocks)

#### Tauri commands to expose (implement in Phase 1, wire sync transport later)

```rust
/// Returns all local changes since `since_version` as a base64-encoded changeset blob.
get_changes(since_version: i64) -> Result<String>

/// Applies a base64-encoded changeset blob received from another device.
apply_changes(changeset: String) -> Result<()>

/// Returns the current local version (used as cursor for incremental sync).
get_db_version() -> Result<i64>
```

These commands are the **sync API surface**. Any transport (WebSocket relay, S3, iCloud Drive,
a custom server) just needs to move blobs between devices and call these two commands.

#### What to implement now vs. later

| Now (Phase 1) | Later (out of scope) |
|---|---|
| Load `crsqlite` extension on startup | Sync transport (WebSocket, S3, etc.) |
| `crsql_as_crr` on all tables | Auth / device identity |
| `get_changes` / `apply_changes` / `get_db_version` commands | Conflict UI (not needed — CRDTs handle it) |
| `db_path` command | Background sync daemon |

#### Full restore from remote (DB deleted locally)

If the user deletes the local DB, the app re-creates it from scratch on startup (migrations run,
singleton is seeded). The sync transport then calls `apply_changes` with the full remote
changeset (i.e. `since_version = 0`), which replays the entire history onto the blank DB.

No special restore path is needed — `apply_changes` is already idempotent and handles this case.
The transport layer must store the **full changeset history** (not just deltas since last sync)
so a from-scratch restore is always possible.

#### Loading the extension in Rust

`crsqlite` ships as a native `.so` / `.dylib` / `.dll`. Bundle it in `src-tauri/` and load it
via `libloading` or SQLite's `load_extension` API after opening the connection:

```rust
conn.load_extension(extension_path, Some("sqlite3_crsqlite_init"))?;
```

Tauri's bundler must include the extension binary for each target platform. Add it to
`tauri.conf.json` under `bundle.resources`.

### Promotion (GlobalNotepad → WorkItem)

Promotion is triggered by **text selection**, not block selection. The user selects any text
range in the GlobalNotepad using the mouse or keyboard, then triggers promotion via:
- The BlockSuite floating toolbar that appears on selection (custom action button added to it)
- Or the `/promote` slash command (promotes the current block's content)

Promotion flow:
1. Capture the selected text content from the BlockSuite editor via the selection API
2. A new WorkItem is created with `status = queue` and an empty title
3. The selected text becomes the first paragraph block in the new WorkItem's document
4. The selection is deleted from the GlobalNotepad document
5. The WorkItem modal opens immediately with the title field focused for the user to fill in
6. Steps 2–4 are atomic — the Yjs updates to both documents and the SQL insert happen in a
   single Rust transaction; on failure, both document states are rolled back

**Note:** Because BlockSuite manages the document state internally via Yjs, "deleting the
selection" means applying a Yjs delete operation to the GlobalNotepad doc and saving the
resulting state. The Rust backend receives two blobs (updated GlobalNotepad + new WorkItem doc)
and writes them atomically.

---

### Kanban Columns

| Display name | Filter                                    |
|--------------|-------------------------------------------|
| Queue        | `status = queue`                          |
| Priority     | `status = priority`                       |
| Parked       | `status = in_progress, is_focus = false`  |
| Focus        | `status = in_progress, is_focus = true`   |
| Done         | `status = done`                           |

"Parked" and "Focus" render as sub-columns inside a parent "In Progress" column, separated by a
dotted vertical divider. The Focus sub-column accepts at most one item (enforced in both backend
and UI).

---

### WorkItem Panel

Clicking a WorkItem card in the Kanban opens a centered modal containing:
- The WorkItem's title (editable inline)
- Its status badge (clickable to change status)
- Its full Notepad body (same editor as GlobalNotepad)

The panel closes when the user clicks outside or presses Escape.

---

## Navigation & Layout

```
┌──────────────────────────────────────────────────┐
│  Top nav: [Notepad] [Kanban]                     │
├──────────────────────────────────────────────────┤
│                                                  │
│  Main view (switches between Notepad / Kanban)   │
│                                                  │
└──────────────────────────────────────────────────┘

         ┌─────────────────────────────┐
         │  WorkItem modal             │
         │  (centered, backdrop blur)  │
         │                             │
         │  title / status / blocks    │
         └─────────────────────────────┘
```

The WorkItem panel opens as a centered modal dialog with a blurred backdrop overlay on top of
whichever view is active.

---


---

## Project Structure

The repo starts from a standard Tauri 2.0 scaffold. All source lives under `notehty/`.

```
notehty/                         # repo root
├── notehty/                     # Tauri project root (cd here for cargo/npm commands)
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs              # Tauri builder, startup sequence
│   │   │   ├── lib.rs               # register_commands, app state
│   │   │   ├── db.rs                # connection pool, run_migrations, extension loading
│   │   │   ├── error.rs             # Error enum, Result<T> alias
│   │   │   ├── models.rs            # Diesel model structs
│   │   │   ├── schema.rs            # Generated by diesel CLI — do not edit
│   │   │   ├── commands/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── notepad.rs       # get_global_notepad
│   │   │   │   ├── blocks.rs        # create_block, update_block, delete_block, reorder_blocks
│   │   │   │   ├── work_items.rs    # list, create, update_title, set_status, set_focus, delete
│   │   │   │   ├── promotion.rs     # promote_block
│   │   │   │   └── sync.rs          # get_changes, apply_changes, get_db_version, db_path
│   │   │   └── sync/
│   │   │       └── mod.rs           # CR-SQLite helpers (extension loading, crsql_as_crr)
│   │   ├── migrations/
│   │   │   └── <timestamp>_initial/
│   │   │       ├── up.sql
│   │   │       └── down.sql
│   │   ├── resources/
│   │   │   ├── crsqlite.so          # Linux
│   │   │   ├── crsqlite.dylib       # macOS
│   │   │   └── crsqlite.dll         # Windows
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json          # bundle.resources must include resources/*
│   │   └── build.rs
│   ├── src/
│   │   ├── components/
│   │   │   ├── NotepadView.tsx
│   │   │   ├── KanbanView.tsx
│   │   │   ├── WorkItemModal.tsx
│   │   │   ├── editor/
│   │   │   │   ├── BlockSuiteEditor.tsx  # React wrapper for BlockSuite web component
│   │   │   │   └── EditorProvider.tsx    # workspace/doc lifecycle management
│   │   │   └── kanban/
│   │   │       ├── KanbanColumn.tsx
│   │   │       ├── KanbanCard.tsx
│   │   │       └── InProgressColumn.tsx  # parent column with Parked/Focus sub-columns
│   │   ├── invoke.ts                # typed wrappers around invoke() — no raw strings elsewhere
│   │   ├── App.tsx
│   │   ├── app.css
│   │   └── main.tsx
│   ├── static/                      # static assets (Vite copies as-is)
│   ├── .diesel.toml
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── INSTRUCTIONS.md
└── LICENSE
```

### Rules
- All commands are run from `notehty/notehty/` (the Tauri project root), not the repo root
- All `invoke()` calls go through `src/invoke.ts` — typed wrappers, never raw strings in components
- Rust commands are split by domain into `commands/` submodules, all registered in `lib.rs`
- `schema.rs` is generated — never edit manually; re-run `diesel migration run` to regenerate
- CR-SQLite binaries are platform-specific; all three must be present in `resources/` and declared in `tauri.conf.json` under `bundle.resources`
- BlockSuite components are web components — always mount via `useRef` + `useEffect` in React, never render as JSX tags directly


---

## Design System

### Aesthetic Reference
**Raycast + Obsidian** is the target aesthetic:
- Deep near-black backgrounds with layered surface depth (not flat, not gradient — stratified)
- Sharp, modern typography with strong size hierarchy
- Single cool-violet accent color; everything else is neutral
- Visible structure (cards, borders, column blocks) but zero decorative chrome
- Interactions feel instant — no transition animations longer than 120ms

### Typography
Font: **Geist** (`@fontsource/geist`) — Vercel's open-source font used by Raycast. Sharp at
small sizes, excellent monospaced companion (`@fontsource/geist-mono`) for code/metadata.

```css
body {
  font-family: 'Geist', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
```

### Color Tokens
Define in `src/app.css`. **Never hardcode hex values in components.**

```css
:root {
  /* Surfaces — layered depth, darkest to lightest */
  --bg:          #0d0d0f;   /* app root background */
  --surface-1:   #131316;   /* sidebar */
  --surface-2:   #1c1c20;   /* main content area, column bodies */
  --surface-3:   #242428;   /* cards, inputs, popovers */
  --surface-4:   #2e2e33;   /* hover states, active items */

  /* Borders — white at low opacity, never a grey hex */
  --border:      rgba(255,255,255,0.07);
  --border-mid:  rgba(255,255,255,0.12);

  /* Text */
  --text:        #f0f0f2;   /* primary */
  --text-muted:  #888892;   /* secondary, placeholders */
  --text-subtle: #4a4a52;   /* disabled, very secondary */

  /* Accent — Raycast violet */
  --accent:      #7c6af7;
  --accent-dim:  rgba(124,106,247,0.15);  /* accent backgrounds */
  --accent-text: #a99ef9;                 /* accent on dark surface */

  /* Semantic */
  --focus-accent: #a78bfa;  /* Focus column indicator */
  --danger:       #f87171;  /* destructive actions */
}
```

### UnoCSS Setup
- Install: `npm install -D unocss @unocss/preset-wind`
- Configure in `vite.config.js` via the UnoCSS Vite plugin
- Use the `@unocss/preset-wind` preset (Tailwind-compatible class names)
- Extend the preset's theme to map the CSS variables above so utility classes resolve to them
- No component library (no shadcn, no DaisyUI) — every component is hand-rolled

### Spacing & Shape
- Base unit: `4px`. Use multiples: `4, 8, 12, 16, 20, 24, 32, 48`
- Border radius: `6px` for cards/inputs, `4px` for small elements (badges, tags), `8px` for modals
- Border width: always `1px solid var(--border)` or `var(--border-mid)` for emphasis

### Layout Principles
- The app must fill 100% of the Tauri window at all times — `html, body, #app { height: 100%; margin: 0; }`
- All views use `h-full w-full` — nothing should have a fixed pixel width or height except icons
- Scrolling is per-region (notepad content scrolls, Kanban columns scroll independently), never the whole window
- No horizontal scroll at the app level under any window size
- Background colors follow the surface layer system: `--bg` → `--surface-1` (sidebar) →
  `--surface-2` (content) → `--surface-3` (cards) — depth through layering, not shadows

### Navigation Shell
```
┌──────────────────────────────────────────────────────────────┐  bg: --bg
│ sidebar (220px)   │ main content (flex-1)                    │
│ bg: --surface-1   │ bg: --surface-2                          │
│                   │                                          │
│  ◆ Notehty        │  [active view fills full space]          │
│  ───────────────  │                                          │
│  ✦ Notepad        │                                          │
│  ⊞ Kanban         │                                          │
│                   │                                          │
│  (future items)   │                                          │
└──────────────────────────────────────────────────────────────┘
```
- Sidebar background: `--surface-1`. Main content: `--surface-2`.
- Sidebar is always visible; collapses to icon-only strip (48px) on toggle button
- Active nav item: `--accent` left border (2px) + `--accent-dim` background tint
- Nav item icons from `lucide-svelte` — `FileText` for Notepad, `LayoutGrid` for Kanban
- No top navigation bar — sidebar handles all navigation
- Logo: "Notehty" in Geist 13px semibold, `--text-muted`, uppercase tracking-wide

### Buttons & Interactions Philosophy
Use buttons **only when absolutely necessary** (destructive actions, form confirms).
Prefer:
- **Slash commands** for inserting content (`/draw`, `/diagram`, `/todo`, etc.)
- **Drag handles** for reordering
- **Inline click targets** (click card title to edit, click status badge to cycle)
- **Context menus** (right-click) for secondary actions (delete, promote)

---

## Slash Commands

Slash commands are the primary interaction model for the Notepad editor.

### Behaviour
- Typing `/` on an empty line (or after a space) opens the **command palette**
- The palette is a floating popover anchored below the cursor
- It shows a filterable, keyboard-navigable list of available commands
- Typing after `/` filters the list with fuzzy search + autocomplete
- `Enter` or click executes the highlighted command; `Escape` dismisses

### Available Commands

| Command     | Action                                              |
|-------------|-----------------------------------------------------|
| `/draw`     | Insert a new freeform drawing block below cursor    |
| `/diagram`  | Insert a new diagram block below cursor             |
| `/h1`       | Convert current line to Heading 1                   |
| `/h2`       | Convert current line to Heading 2                   |
| `/h3`       | Convert current line to Heading 3                   |
| `/bullet`   | Start a bullet list                                 |
| `/numbered` | Start a numbered list                               |
| `/promote`  | Promote current block to a WorkItem                 |

### Implementation
- BlockSuite's `DocEditor` includes a built-in slash command widget (`SlashMenuWidget`)
- Extend it by registering custom slash menu items via the block spec's widget config —
  no need to build a suggestion popup from scratch
- `/draw` inserts a BlockSuite surface/freeform block using the editor's command API
- `/diagram` inserts an embedded `EdgelessEditor` block inline
- `/promote` triggers the promotion flow (captures selection, calls Rust backend)
- The same slash menu config is applied to both GlobalNotepad and WorkItem editors via a
  shared `editorConfig` constant

## Implementation Phases

Work through these phases in order. **Do not start a phase until the previous one passes
`cargo check`, `cargo clippy`, and `tsc --noEmit` with zero errors.**

---

### Phase 1 — Project Scaffold & DB Foundation

**Goal:** Compilable Tauri project with migrations running on startup.

Steps:
1. Verify the Tauri 2.0 project compiles (`cargo tauri dev` succeeds, blank window opens)
2. Add Diesel dependencies: `diesel`, `diesel_migrations`, `libsqlite3-sys` (feature `bundled`)
3. Create `src-tauri/src/db.rs`:
   - Resolve the DB path via Tauri's `app_handle.path().app_data_dir()` — this resolves to the
     OS-appropriate user data directory (e.g. `~/.local/share/notehty/` on Linux,
     `~/Library/Application Support/notehty/` on macOS, `%APPDATA%\notehty\` on Windows)
   - File name: `notehty.db`
   - Create the directory if it doesn't exist before opening the connection
   - Connection pool (one connection is fine for SQLite)
   - `run_migrations()` called from `main.rs` before the Tauri builder
   - Expose the resolved DB path via a `db_path() -> Result<String>` Tauri command (needed for
     future cloud sync to know what file to watch/sync)
4. Write initial migration (`diesel migration generate initial`):
   ```sql
   CREATE TABLE work_items (
     id         INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
     title      TEXT NOT NULL DEFAULT '',
     status     TEXT NOT NULL DEFAULT 'queue'
                CHECK(status IN ('queue','priority','in_progress','done')),
     is_focus   INTEGER NOT NULL DEFAULT 0
                CHECK(is_focus IN (0,1)),
     created_at TEXT NOT NULL DEFAULT (datetime('now')),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   -- Stores serialized Yjs binary state for each document.
   -- 'global' is the singleton GlobalNotepad; work item docs use the work_item id as text.
   CREATE TABLE documents (
     id         TEXT PRIMARY KEY NOT NULL,
     yjs_state  BLOB NOT NULL DEFAULT (X''),
     updated_at TEXT NOT NULL DEFAULT (datetime('now'))
   );

   -- FTS5 full-text search index
   CREATE VIRTUAL TABLE fts_content USING fts5(
     doc_id UNINDEXED,
     title,
     body,
     tokenize = 'unicode61'
   );

   -- Seed the singleton global notepad document
   INSERT INTO documents (id) VALUES ('global');
   ```
5. Run `diesel migration run`, commit generated `schema.rs`
6. Load the `crsqlite` extension immediately after opening the connection:
   ```rust
   conn.load_extension(extension_path, Some("sqlite3_crsqlite_init"))?;
   ```
   Then run:
   ```sql
   SELECT crsql_as_crr('work_items');
   SELECT crsql_as_crr('blocks');
   SELECT crsql_as_crr('global_notepad');
   ```
7. Implement `get_changes`, `apply_changes`, `get_db_version` commands (stubs are fine — just
   wire the SQL calls; no transport needed yet)
8. `cargo check && cargo clippy`

**Verify:** App starts, no migration errors in console, `notehty.db` exists with correct schema.

---

### Phase 2 — Rust Backend: Models, Errors, Commands

**Goal:** All Tauri commands implemented and testable via `invoke` from the browser console.

#### Error type

```rust
// src-tauri/src/error.rs

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Diesel(#[from] diesel::result::Error),
    #[error(transparent)]
    DieselConnection(#[from] diesel::ConnectionError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("{0}")]
    Logic(String),
}

// Tauri requires commands to return a serializable error.
impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
```

Use `?` throughout — never `.map_err(|e| e.to_string())`. Add further `#[from]` variants as new
error sources are introduced (e.g. `serde_json::Error` if JSON parsing is added). The `Logic`
variant covers domain invariant violations (e.g. setting focus on a non-in_progress item).

#### Models (`src-tauri/src/models.rs`)

Derive `Queryable`, `Insertable`, `Serialize`, `Deserialize` as needed.

#### Commands to implement

**Documents (BlockSuite Yjs persistence)**
- `get_document(id: String) -> Result<Vec<u8>>` — returns raw Yjs binary state for the doc
- `update_document(id: String, yjs_state: Vec<u8>, plain_text: String, title: String) -> Result<()>` — saves Yjs blob and updates FTS5 index atomically
- `promote_selection(global_yjs: Vec<u8>, new_item_yjs: Vec<u8>, title: String) -> Result<WorkItem>` — atomically writes both updated docs + creates WorkItem

**WorkItems**
- `list_work_items() -> Result<Vec<WorkItemWithBlocks>>`
- `create_work_item() -> Result<WorkItem>` — creates with empty title and `status = queue`; frontend immediately focuses the title field
- `update_work_item_title(id: i32, title: String) -> Result<WorkItem>`
- `set_work_item_status(id: i32, status: WorkItemStatus) -> Result<WorkItem>` — atomically clears `is_focus` if moving away from `in_progress`
- `set_focus(id: i32) -> Result<WorkItem>` — clears `is_focus` on all other items, sets it on `id`; errors if item is not `in_progress`
- `delete_work_item(id: i32) -> Result<()>`

**Promotion**
- `promote_block(block_id: i32) -> Result<WorkItem>` — atomic transaction:
  1. Load block
  2. Create WorkItem with `title = ''` and `status = queue`; the frontend immediately focuses the title field for the user to fill in
  3. Create a copy of the block under the new WorkItem
  4. Delete the original block
  5. Return the new WorkItem

Register all commands in `main.rs` via `.invoke_handler(tauri::generate_handler![...])`.

**Verify:** `cargo check && cargo clippy` clean.

---

### Phase 3 — Frontend Foundation

**Goal:** React 19 app shell with routing between Notepad and Kanban views, no real data yet.

Steps:
1. The Tauri scaffold already includes React 19. Install additional deps:
   `npm install -D unocss @unocss/preset-wind lucide-react @fontsource/geist @fontsource/geist-mono`
   Configure UnoCSS Vite plugin in `vite.config.ts` with `presetWind` and CSS var theme mapping.
2. Set up `src/App.css`:
   - Import Geist fonts via `@fontsource/geist`
   - Define all CSS custom property tokens from the Design System section
   - Set `html, body, #app { height: 100%; margin: 0; background: var(--bg); }`
3. Build the app shell: sidebar (`--surface-1`, 220px) + `flex-1` main content (`--surface-2`)
   with the collapsible sidebar (220px ↔ 48px icon-only toggle)
4. Implement navigation between **Notepad** and **Kanban** via sidebar, React `useState`
5. Stub `<NotepadView />` and `<KanbanView />` filling the full content area (`h-full w-full`)
6. Stub `<WorkItemModal />` as a hidden centered modal
7. Wire `invoke` imports — confirm a dummy `invoke('greet')` round-trip works
8. `tsc --noEmit` clean

**Verify:** App fills the full window. Sidebar collapses cleanly. Surfaces are visually distinct
layers. Font is Geist. No layout shift on collapse.

**Verify:** App opens, tabs switch views, no TypeScript errors.

---

### Phase 4 — Notepad View

**Goal:** Functional global notepad powered by BlockSuite's unified editor.

#### Architecture

All block types (text, freeform drawing, diagrams) are handled natively by BlockSuite's
`AffineEditorContainer` web component. There are no separate `<TextBlock />`, `<FreeformBlock />`,
or `<DiagramBlock />` React components — the entire editing surface is one BlockSuite document.

#### Components to build

**`EditorProvider` (`src/components/editor/EditorProvider.tsx`)**
- React context that manages a single `DocCollection` (BlockSuite workspace) for the whole app
- Call `effects()` from `@blocksuite/presets/effects` **once** at module load to register all
  web components (`affine-editor-container`, etc.) as custom elements
- `getOrLoadDoc(id)` — async; checks cache, loads from `get_document(id)` backend if not cached,
  calls `Y.applyUpdate(doc.spaceDoc, savedBytes)` to restore, then `doc.load()`
- For new docs (empty blob), call `doc.load(() => { d.addBlock('affine:page', {}); ... })` using
  `doc as any` to bypass TypeScript strict flavour typing for `addBlock`
- Must wrap the entire app (wrap `<App />` in `<EditorProvider>` in `main.tsx`)

**`BlockSuiteEditor` (`src/components/editor/BlockSuiteEditor.tsx`)**
- Mounts `affine-editor-container` via `useRef` + `useEffect` — never as a JSX tag
- `document.createElement('affine-editor-container')` → set `.doc` and `.mode` props → append to ref
- Debounced save (500ms) on `spaceDoc.on('update', ...)` events →
  calls `update_document(id, bytes, plainText, title)`
- `extractTitle` / `extractPlainText`: cast `getBlockByFlavour(...)` results `as unknown as {...}`
  to access `.title` / `.text` properties (BlockSuite's TS types don't expose these directly)
- Props: `docId: string`, `mode: 'page' | 'edgeless'`

**`NotepadView` (`src/components/NotepadView.tsx`)**
- Renders `<BlockSuiteEditor docId="global" mode="page" />`
- Receives `onPromote` prop (for future promotion flow)

#### Key gotchas

- `effects()` must be called before any editor is mounted; call at top of `EditorProvider.tsx`
- `doc.addBlock('affine:surface', ...)` fails TypeScript strict checking because `'affine:surface'`
  is not in the `Flavour` union — cast `doc as any` for the init callback
- BlockSuite `getBlockByFlavour()` returns `BlockModel[]` but model properties (`.title`, `.text`)
  are not in the TS types — use `as unknown as { title?: ... }` casts
- `Y.encodeStateAsUpdate` returns `Uint8Array`; Tauri serialises `Vec<u8>` as `number[]` —
  use `Array.from(bytes)` when sending to backend, `new Uint8Array(arr)` when receiving
- Version pinning: all `@blocksuite/*` packages must be the same version (0.19.5); a top-level
  newer version of `@blocksuite/store` will cause silent runtime failures

**Verify:** App opens, global notepad is editable, text persists across restarts (check SQLite).

---

### Phase 5 — Kanban View

**Goal:** Functional Kanban board with drag-and-drop between columns.

#### Layout

The Kanban board fills 100% of the available window space (width and height). Columns stretch
to full height; cards stack vertically within each column with independent scroll.

```
┌──────────┬──────────┬──────────────────────────┬──────────┐
│  Queue   │ Priority │      In Progress         │   Done   │
│          │          │  Parked  ┊  Focus        │          │
│  [card]  │  [card]  │  [card]  ┊  [card]       │  [card]  │
│  [card]  │          │  [card]  ┊               │          │
│          │          │          ┊               │          │
│  [+ Add] │  [+ Add] │  [+ Add] ┊               │  [+ Add] │
└──────────┴──────────┴──────────────────────────┴──────────┘
```

- Each column is a distinct visual block (surface color `--color-surface`, radius, subtle border)
- Columns have a header with the status name and card count badge
- "In Progress" is the parent column; "Parked" and "Focus" are sub-columns separated by a dotted
  vertical divider (`border-dashed`)
- Parked holds any number of cards; Focus holds at most one card
- Dragging a second card into Focus displaces the current one back to Parked
- Columns expand to fill available height; each column's card list scrolls independently

#### WorkItem card

Each card is a `--surface-3` rounded block (`6px`) with a `1px solid var(--border)` border.

Contents:
- Title in Geist 13px `--text`
- Status badge: small pill, color-coded by status using `--accent-dim` / `--accent-text`
- Subtle `--surface-4` hover state
- Drag handle icon (`GripVertical` from lucide) visible on hover, left edge

Click anywhere on card (except drag handle) → opens `<WorkItemModal />`.

#### Creating a WorkItem from scratch

Each column has a **+ Add** button at the bottom. Clicking it:
1. Calls `invoke('create_work_item')` with the column's status
2. Immediately opens the modal with the title field focused and empty
3. User types a title; saving with an empty title shows an inline validation error

#### Drag and drop

Use **`@dnd-kit/core` + `@dnd-kit/sortable`** — the standard for production React Kanban boards
(used by Linear, Vercel, etc.). Install:
```
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Pattern:
- Wrap the entire board in `<DndContext onDragStart onDragOver onDragEnd>`
- Each card uses `useDraggable({ id })` — passes `attributes`, `listeners`, `setNodeRef`
- Each column uses `useDroppable({ id: status })` — `isOver` for visual feedback
- Use `<DragOverlay>` to render a ghost card while dragging (decoupled from the actual card)
- `onDragEnd`: call `invoke('set_work_item_status')` or `invoke('set_focus')` based on target
- After any mutation: re-fetch `list_work_items` to sync state

**DnD must be fully functional before the phase is considered complete.** Test every scenario:
all column combinations, Focus displacement, within-column reorder.

Focus column constraint:
- In `onDragOver`: if target is Focus and it already has an item, show a visual "displacement"
  preview (briefly highlight the card that will be demoted)
- In `onDragEnd`: call `invoke('set_focus', { id })` — backend handles demotion atomically

#### Data loading

On mount: `invoke('list_work_items')`.
After any mutation, re-fetch (or update local `$state` optimistically).

**Verify:** Cards appear in correct columns. Drag-and-drop updates status. Focus column rejects a second item.

---

### Phase 6 — WorkItem Panel

**Goal:** Clicking a card opens a centered modal with the WorkItem's full notepad.

#### Modal contents
- Inline-editable title → `invoke('update_work_item_title')`
- Status selector → `invoke('set_work_item_status')`
- Focus toggle (only when `status = in_progress`) → `invoke('set_focus')`
- Full block editor (`<BlockSuiteEditor docId={String(item.id)} mode="page" />`)
  - Doc is loaded/cached by `EditorProvider`; saves automatically on change
  - Slash commands work identically to the GlobalNotepad (BlockSuite built-in)
- Toolbar row (top-right of modal):
  - **⤢ Open in new window** — opens the WorkItem in a dedicated Tauri window (full screen,
    same editor, no modal chrome). Use `tauri::WebviewWindowBuilder` to spawn the window,
    passing the WorkItem id as a query param.
  - **✕ Close** — closes the modal
- Delete WorkItem: accessible via right-click context menu on the title, not a visible button

#### UX
- Opens as a centered modal occupying ~85% of window width and ~90% of window height
- Blurred backdrop (`backdrop-filter: blur(4px)`) dims the content behind
- Close on Escape or click outside the modal
- Modal state managed in top-level React `useState` (selected WorkItem or `null`)

**Verify:** Open panel, edit title, change status, add a block, close panel — all persisted.

---

### Phase 7 — Polish & Edge Cases

**Goal:** No rough edges, correct constraint enforcement.

Checklist:
- [ ] Focus column enforces the one-item mutex visually (drag blocked, tooltip explains why)
- [ ] Promotion is atomic — no orphaned blocks on failure
- [ ] Deleting a WorkItem deletes its blocks (cascade in SQL or explicit in command)
- [ ] GlobalNotepad singleton is seeded exactly once (idempotent startup)
- [ ] All Tauri commands return structured errors surfaced as toast/snackbar in UI
- [ ] Reordering blocks handles gaps and ties (re-index positions 0, 1, 2… on every reorder)
- [ ] Diagram and freeform blocks render correctly at panel width
- [ ] App window title: "Notehty"
- [ ] `cargo clippy` with `#![deny(clippy::unwrap_used)]` in lib code — no unwraps
- [ ] `tsc --noEmit` clean
- [ ] Manual smoke test: create note → promote → open in panel → edit → change status → done
- [ ] Window resize: all views fill the full window at any size, no overflow, no fixed-width
      containers breaking layout
- [ ] Sidebar collapses and expands without layout shift in the main content area
- [ ] Slash command palette opens on `/`, filters correctly, inserts correct block type, and
      dismisses cleanly on Escape
- [ ] WorkItem "open in new window" spawns a functional Tauri window with the full editor
- [ ] DnD smoke test: drag every card type to every valid target; confirm Focus displacement works
- [ ] Block reorder smoke test: reorder in GlobalNotepad and in a WorkItem panel

---

## Coding Conventions

- Rust: no panics in library code, errors as values, no unnecessary comments
- All Tauri commands return `crate::error::Result<T>` — use `?` for error propagation; never `.map_err(|e| e.to_string())`
- React: hooks only (`useState`, `useEffect`, `useRef`), no class components; all components are function components
- BlockSuite web components are always mounted via `useRef` + `useEffect`, never as JSX tags
- TypeScript: `const` + arrow functions, no `any`
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- Commit messages must describe **what changed and why**, not which phase was completed.
  Bad: `feat: complete phase 3`. Good: `feat(shell): add collapsible sidebar with nav state`
- Run `cargo check && cargo clippy` after every Rust change
- Run `tsc --noEmit` after every TypeScript change

---

## Known Gotchas

Issues discovered during initial implementation that future agents must be aware of:

### Rust / Diesel

- **No RETURNING clause for SQLite in Diesel 2.2** — `diesel::insert_into(...).returning(...)`
  does not compile for SQLite. Pattern: `insert.execute(&conn)?` then query by id immediately after
  using `dsl::work_items.order(id.desc()).first(&conn)?`.
- **`use tauri::Manager` is mandatory** — without it, both `app.path()` (in setup closure) and
  `AppHandle::path()` (in commands) fail to resolve. Add this import in every file that calls `.path()`.
- **FTS5 `fts_content` excluded from `schema.rs`** — Diesel doesn't support virtual tables.
  All FTS operations must use `diesel::sql_query()` raw SQL.
- **`crsqlite` extension loading** — `libsqlite3-sys` with `bundled` doesn't expose the raw
  `*sqlite3` handle through Diesel's public API. The FFI approach (pointer cast through `SqliteConnection`)
  is fragile and unsafe. Prefer the graceful skip: log a warning if the binary is absent, continue.

### BlockSuite 0.19.5

- **All `@blocksuite/*` packages must be pinned to the same version** — mismatched versions
  (e.g. `@blocksuite/store@0.22.4` co-existing with `@blocksuite/presets@0.19.5`) cause silent
  runtime failures. After install, check `node_modules/@blocksuite/*/package.json` versions match.
- **`effects()` must run before any editor mounts** — call at module load in `EditorProvider.tsx`,
  not inside `useEffect`. Missing this causes `affine-editor-container` to render as an empty div.
- **`doc.addBlock` strict typing** — `'affine:surface'` is not in the `Flavour` union type in 0.19.5.
  Cast `doc as any` for the new-doc init callback.
- **`getBlockByFlavour` return type** — returns `BlockModel[]` but model properties (`.title`, `.text`)
  are not on the TS type. Use `as unknown as { title?: { toString: () => string } }` pattern.
- **Yjs bytes transport** — `Y.encodeStateAsUpdate` → `Uint8Array`. Tauri serialises `Vec<u8>` as
  `number[]`. Use `Array.from(bytes)` when sending to backend; `new Uint8Array(arr)` when receiving.

---

- Authentication
- Cloud sync transport (CR-SQLite changesets are ready; just needs a relay — WebSocket server, S3 bucket, etc.)
- Mobile
- Notifications
- Multi-window support
