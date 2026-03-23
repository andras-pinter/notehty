use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Queue,
    Priority,
    InProgress,
    Done,
}

impl Status {
    pub fn from_db(s: &str) -> Self {
        match s {
            "priority" => Self::Priority,
            "in_progress" => Self::InProgress,
            "done" => Self::Done,
            _ => Self::Queue,
        }
    }

    pub fn to_db(&self) -> &'static str {
        match self {
            Self::Queue => "queue",
            Self::Priority => "priority",
            Self::InProgress => "in_progress",
            Self::Done => "done",
        }
    }
}
