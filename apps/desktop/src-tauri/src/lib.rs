use serde::Serialize;
use std::path::Path;
use std::time::UNIX_EPOCH;
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
        if !is_audio_file(&path) {
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:major-ambience.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![scan_folder])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
