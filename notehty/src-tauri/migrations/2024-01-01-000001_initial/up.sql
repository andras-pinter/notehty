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
INSERT INTO documents (id, yjs_state) VALUES ('global', X'');
