use serde::Serialize;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Serialize)]
pub struct ScannedTrack {
    pub path: String,
    pub file_name: String,
    pub parent_folder: String,
    pub parent_folder_path: String,
    pub size_bytes: u64,
    pub mtime_secs: u64,
}

#[tauri::command]
fn scan_folder(path: String) -> Result<Vec<ScannedTrack>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("not a directory: {}", path));
    }
    let mut out = Vec::new();
    walk(root, &mut out).map_err(|e| e.to_string())?;
    Ok(out)
}

fn walk(dir: &Path, out: &mut Vec<ScannedTrack>) -> std::io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() {
            walk(&path, out)?;
            continue;
        }
        if !is_audio_file(&path) || is_macos_resource_fork(&path) {
            continue;
        }
        let meta = entry.metadata()?;
        let mtime_secs = meta
            .modified()
            .ok()
            .and_then(|m| m.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let file_name = path
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let parent = path.parent();
        let parent_folder = parent
            .and_then(|p| p.file_name())
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_default();
        let parent_folder_path = parent
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_default();
        out.push(ScannedTrack {
            path: path.to_string_lossy().into_owned(),
            file_name,
            parent_folder,
            parent_folder_path,
            size_bytes: meta.len(),
            mtime_secs,
        });
    }
    Ok(())
}

fn is_macos_resource_fork(p: &Path) -> bool {
    p.file_name()
        .and_then(|s| s.to_str())
        .map(|n| n.starts_with("._"))
        .unwrap_or(false)
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(&path, contents).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct WindowStateStat {
    pub exists: bool,
    pub size_bytes: u64,
    pub mtime_secs: u64,
    pub path: String,
}

// Integrity probe for tauri-plugin-window-state. The plugin persists
// window geometry to `<app_config_dir>/.window-state.json` on close;
// silent persistence failure is the class of bug that turns into "my
// scenes vanished" if it ever spreads to shared infra. Renderer logs
// the stat into the diag buffer at boot so a stale mtime across
// successive boots is visible in any bug report dump.
#[tauri::command]
fn window_state_stat(app: tauri::AppHandle) -> Result<WindowStateStat, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    let p = dir.join(".window-state.json");
    let path_str = p.to_string_lossy().into_owned();
    match std::fs::metadata(&p) {
        Ok(m) => {
            let mtime_secs = m
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);
            Ok(WindowStateStat {
                exists: true,
                size_bytes: m.len(),
                mtime_secs,
                path: path_str,
            })
        }
        Err(_) => Ok(WindowStateStat {
            exists: false,
            size_bytes: 0,
            mtime_secs: 0,
            path: path_str,
        }),
    }
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

fn is_audio_file(p: &Path) -> bool {
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());
    matches!(
        ext.as_deref(),
        Some("mp3") | Some("wav") | Some("flac") | Some("ogg") | Some("m4a") | Some("aac")
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create initial schema",
        sql: include_str!("../migrations/0001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        // Window-state plugin restores last window size/position on launch
        // and saves on close. No JS-side wiring needed; the plugin
        // intercepts the window lifecycle automatically.
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:major-ambience.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            scan_folder,
            write_text_file,
            read_text_file,
            window_state_stat
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
