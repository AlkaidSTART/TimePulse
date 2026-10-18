use tauri_plugin_sql::{Migration, MigrationKind};

/// 与前端 `src/services/db/sqlite.ts` 共用的连接串：
/// 数据库文件落位于系统应用配置目录下的 timepulse.db
const TIMEPULSE_DATABASE_URL: &str = "sqlite:timepulse.db";

/// SQLite 表结构迁移（Tauri 桌面端 / 移动端）。
/// 前端只负责读写，schema 的唯一权威来源在这里。
fn database_migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_timepulse_core_tables",
        sql: r#"
CREATE TABLE IF NOT EXISTS timers (
  id          TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS todo_items (
  id          TEXT PRIMARY KEY,
  data        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_backgrounds (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  url         TEXT,
  mime_type   TEXT NOT NULL,
  size        INTEGER NOT NULL DEFAULT 0,
  width       INTEGER NOT NULL DEFAULT 0,
  height      INTEGER NOT NULL DEFAULT 0,
  name        TEXT,
  uploaded_at TEXT NOT NULL,
  blob_base64 TEXT
);

CREATE INDEX IF NOT EXISTS idx_timers_sort_order ON timers (sort_order);
CREATE INDEX IF NOT EXISTS idx_todo_items_sort_order ON todo_items (sort_order);
"#,
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_haptics::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(TIMEPULSE_DATABASE_URL, database_migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
