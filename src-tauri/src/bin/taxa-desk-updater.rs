#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::Utc;
use std::{
    env,
    fs::{self, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{Duration, Instant},
};
use zip::ZipArchive;

#[derive(Debug)]
struct Args {
    app_dir: PathBuf,
    package: PathBuf,
    pid: u32,
    exe: String,
    log: PathBuf,
}

fn main() {
    match parse_args() {
        Ok(args) => match run_update(&args) {
            Ok(()) => {
                let _ = clear_last_error(&args.app_dir);
                let _ = remove_package(&args.package, &args.log);
            }
            Err(error) => {
                let _ = write_last_error(&args.app_dir, &error);
                let _ = append_log(&args.log, &format!("update failed: {error}"));
            }
        },
        Err(error) => {
            let fallback_log = env::temp_dir().join("taxa-desk-updater.log");
            let _ = append_log(&fallback_log, &format!("update failed (args): {error}"));
        }
    }
}

fn run_update(args: &Args) -> Result<(), String> {
    append_log(&args.log, "portable updater started")?;
    wait_for_process_exit(args.pid, &args.log)?;
    apply_update(args)?;
    append_log(&args.log, "portable update applied")?;
    reopen_app(args)?;

    Ok(())
}

fn updates_dir(app_dir: &Path) -> PathBuf {
    app_dir.join(".updates")
}

fn last_error_path(app_dir: &Path) -> PathBuf {
    updates_dir(app_dir).join("last-error.txt")
}

fn write_last_error(app_dir: &Path, message: &str) -> Result<(), String> {
    let dir = updates_dir(app_dir);
    fs::create_dir_all(&dir).map_err(to_message)?;
    let timestamp = Utc::now().to_rfc3339();
    fs::write(
        last_error_path(app_dir),
        format!("{timestamp}\n{message}\n"),
    )
    .map_err(to_message)
}

fn clear_last_error(app_dir: &Path) -> Result<(), String> {
    let path = last_error_path(app_dir);
    if path.exists() {
        fs::remove_file(path).map_err(to_message)?;
    }
    Ok(())
}

fn remove_package(package: &Path, log_path: &Path) -> Result<(), String> {
    if !package.exists() {
        return Ok(());
    }

    match fs::remove_file(package) {
        Ok(()) => {
            let _ = append_log(log_path, &format!("package removed: {}", package.display()));
        }
        Err(error) => {
            let _ = append_log(log_path, &format!("package cleanup failed: {error}"));
        }
    }

    Ok(())
}

fn parse_args() -> Result<Args, String> {
    let mut app_dir = None;
    let mut package = None;
    let mut pid = None;
    let mut exe = None;
    let mut log = None;
    let mut iter = env::args().skip(1);

    while let Some(arg) = iter.next() {
        let value = iter
            .next()
            .ok_or_else(|| format!("Argomento mancante per {arg}"))?;

        match arg.as_str() {
            "--app-dir" => app_dir = Some(PathBuf::from(value)),
            "--package" => package = Some(PathBuf::from(value)),
            "--pid" => {
                pid = Some(
                    value
                        .parse::<u32>()
                        .map_err(|_| "PID non valido.".to_string())?,
                )
            }
            "--exe" => exe = Some(value),
            "--log" => log = Some(PathBuf::from(value)),
            _ => return Err(format!("Argomento non riconosciuto: {arg}")),
        }
    }

    Ok(Args {
        app_dir: app_dir.ok_or_else(|| "Cartella app mancante.".to_string())?,
        package: package.ok_or_else(|| "Pacchetto update mancante.".to_string())?,
        pid: pid.ok_or_else(|| "PID app mancante.".to_string())?,
        exe: exe.ok_or_else(|| "Eseguibile app mancante.".to_string())?,
        log: log.ok_or_else(|| "Log updater mancante.".to_string())?,
    })
}

fn wait_for_process_exit(pid: u32, log_path: &Path) -> Result<(), String> {
    let started = Instant::now();

    while started.elapsed() < Duration::from_secs(45) {
        if !process_exists(pid) {
            return Ok(());
        }

        thread::sleep(Duration::from_millis(500));
    }

    append_log(log_path, "app process still running after timeout")?;
    Err("Taxa Desk non si è chiuso in tempo per applicare l’aggiornamento.".to_string())
}

fn process_exists(pid: u32) -> bool {
    let output = Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/FO", "CSV", "/NH"])
        .output();

    match output {
        Ok(output) if output.status.success() => {
            let text = String::from_utf8_lossy(&output.stdout);
            text.contains(&pid.to_string()) && !text.contains("INFO:")
        }
        _ => false,
    }
}

fn apply_update(args: &Args) -> Result<(), String> {
    let file = fs::File::open(&args.package).map_err(to_message)?;
    let mut archive = ZipArchive::new(file).map_err(to_message)?;
    let temp_dir = args.app_dir.join(".update-staging");

    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir).map_err(to_message)?;
    }
    fs::create_dir_all(&temp_dir).map_err(to_message)?;

    for index in 0..archive.len() {
        let mut entry = archive.by_index(index).map_err(to_message)?;
        let Some(relative) = entry.enclosed_name().map(|path| path.to_path_buf()) else {
            continue;
        };

        let stripped = match relative.strip_prefix("app") {
            Ok(path) if !path.as_os_str().is_empty() => path.to_path_buf(),
            _ => continue,
        };

        let staged_path = temp_dir.join(&stripped);

        if entry.is_dir() {
            fs::create_dir_all(&staged_path).map_err(to_message)?;
            continue;
        }

        if let Some(parent) = staged_path.parent() {
            fs::create_dir_all(parent).map_err(to_message)?;
        }

        let mut out = fs::File::create(&staged_path).map_err(to_message)?;
        io::copy(&mut entry, &mut out).map_err(to_message)?;
    }

    copy_staged_files(&temp_dir, &args.app_dir, &args.log)?;
    fs::remove_dir_all(&temp_dir).map_err(to_message)?;

    Ok(())
}

fn copy_staged_files(source: &Path, app_dir: &Path, log_path: &Path) -> Result<(), String> {
    for entry in fs::read_dir(source).map_err(to_message)? {
        let entry = entry.map_err(to_message)?;
        let source_path = entry.path();
        let name = entry.file_name();
        let target_path = app_dir.join(name);

        if should_skip_target(&target_path) {
            append_log(
                log_path,
                &format!("skipped protected path: {}", target_path.display()),
            )?;
            continue;
        }

        if source_path.is_dir() {
            fs::create_dir_all(&target_path).map_err(to_message)?;
            copy_staged_files(&source_path, &target_path, log_path)?;
        } else {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent).map_err(to_message)?;
            }
            fs::copy(&source_path, &target_path).map_err(to_message)?;
        }
    }

    Ok(())
}

fn should_skip_target(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| {
            matches!(
                name,
                "data" | "backups" | "logs" | ".updates" | ".update-staging"
            )
        })
        .unwrap_or(false)
}

fn reopen_app(args: &Args) -> Result<(), String> {
    let exe_path = args.app_dir.join(&args.exe);
    Command::new(exe_path)
        .current_dir(&args.app_dir)
        .spawn()
        .map_err(to_message)?;

    Ok(())
}

fn append_log(path: &Path, message: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(to_message)?;
    }

    let timestamp = Utc::now().to_rfc3339();
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(to_message)?;

    writeln!(file, "{timestamp} [portable-updater] {message}").map_err(to_message)
}

fn to_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}
