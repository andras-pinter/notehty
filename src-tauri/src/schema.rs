diesel::table! {
    work_items (id) {
        id              -> Text,
        title           -> Text,
        description     -> Text,
        status          -> Text,
        is_focus        -> Bool,
        canvas_data     -> Nullable<Text>,
        position        -> Integer,
        created_at      -> Timestamp,
        updated_at      -> Timestamp,
    }
}

diesel::table! {
    canvas_blocks (id) {
        id              -> Text,
        kind            -> Text,
        content         -> Text,
        x               -> Double,
        y               -> Double,
        width           -> Double,
        height          -> Double,
        created_at      -> Timestamp,
    }
}
