// @generated automatically by Diesel CLI.
// FTS5 internal tables omitted — queried via raw SQL.

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
