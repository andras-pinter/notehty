// @generated automatically by Diesel CLI — do not edit manually.
// FTS5 virtual tables (fts_content and its shadow tables) are managed via raw SQL.

diesel::table! {
    documents (id) {
        id -> Text,
        yjs_state -> Binary,
        updated_at -> Text,
    }
}

diesel::table! {
    work_items (id) {
        id -> Integer,
        title -> Text,
        status -> Text,
        is_focus -> Integer,
        created_at -> Text,
        updated_at -> Text,
    }
}

diesel::allow_tables_to_appear_in_same_query!(documents, work_items,);
