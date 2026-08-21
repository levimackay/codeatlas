use codeatlas_db::Database;
use std::sync::Arc;

pub struct AppState {
    pub db: Arc<Database>,
}
