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

impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, Error>;
