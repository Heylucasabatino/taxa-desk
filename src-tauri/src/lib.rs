use chrono::{Datelike, Utc};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, fs, io::Write, path::PathBuf, process::Command, sync::Mutex};
use tauri::Manager;
use uuid::Uuid;

const PORTABLE_MANIFEST_URL: &str =
    "https://github.com/Heylucasabatino/taxa-desk/releases/latest/download/portable-manifest.json";

// Same minisign public key used by the Tauri updater (see
// src-tauri/tauri.conf.json -> plugins.updater.pubkey, base64-decoded).
// Public-by-design: this verifies that update packages were signed with
// the matching private key, which is never committed to the repo.
const PORTABLE_UPDATER_PUBKEY_BASE64: &str =
    "RWQl2pksntXCawNLu+6HF0+o6/Zw+0Byu5Qe7ymFXLtqCLyk57PonKr1";

#[derive(Clone)]
struct PortablePaths {
    exe_dir: PathBuf,
    data_dir: PathBuf,
    backups_dir: PathBuf,
    logs_dir: PathBuf,
    database_path: PathBuf,
    writable: bool,
}

struct DbState {
    connection: Mutex<Connection>,
    paths: PortablePaths,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortableDiagnostics {
    exe_dir: String,
    data_dir: String,
    backups_dir: String,
    logs_dir: String,
    database_path: String,
    writable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TaxProfile {
    taxable_coefficient: f64,
    substitute_tax_rate: f64,
    pension_rate: f64,
    pension_minimum: f64,
    integrative_rate: f64,
    integrative_minimum: f64,
    activity_year: i64,
    setup_completed: Option<bool>,
    enforce_minimums_when_empty: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredTaxProfile {
    id: String,
    taxable_coefficient: f64,
    substitute_tax_rate: f64,
    pension_rate: f64,
    pension_minimum: f64,
    integrative_rate: f64,
    integrative_minimum: f64,
    activity_year: i64,
    setup_completed: Option<bool>,
    enforce_minimums_when_empty: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Movement {
    id: Option<String>,
    date: String,
    #[serde(rename = "type")]
    movement_type: String,
    description: String,
    category: String,
    amount: f64,
    status: String,
    notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Goal {
    id: Option<String>,
    name: String,
    target_amount: f64,
    saved_amount: f64,
    target_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Category {
    id: Option<String>,
    name: String,
    #[serde(rename = "type")]
    category_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersonalDeadline {
    id: Option<String>,
    title: String,
    date: String,
    category: String,
    recurrence: String,
    notes: Option<String>,
    completed_occurrences: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppPreferences {
    id: Option<String>,
    safety_threshold_amount: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupMeta {
    app: String,
    version: i64,
    exported_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BackupPayload {
    meta: BackupMeta,
    movements: Vec<Movement>,
    goals: Vec<Goal>,
    settings: StoredTaxProfile,
    categories: Vec<Category>,
    #[serde(default)]
    deadlines: Vec<PersonalDeadline>,
    #[serde(default = "default_preferences")]
    preferences: AppPreferences,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppData {
    movements: Vec<Movement>,
    goals: Vec<Goal>,
    profile: StoredTaxProfile,
    categories: Vec<Category>,
    deadlines: Vec<PersonalDeadline>,
    preferences: AppPreferences,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupResult {
    path: String,
    file_name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PortableUpdateManifest {
    version: String,
    notes: Option<String>,
    pub_date: Option<String>,
    platforms: HashMap<String, PortableUpdatePlatform>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PortableUpdatePlatform {
    url: String,
    sha256: String,
    size: Option<u64>,
    signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PortableUpdateInfo {
    version: String,
    notes: Option<String>,
    pub_date: Option<String>,
    url: String,
    sha256: String,
    size: Option<u64>,
    signature: String,
}

impl DbState {
    fn open() -> Result<Self, String> {
        let paths = init_portable_paths()?;
        let connection = Connection::open(&paths.database_path).map_err(to_message)?;

        connection
            .execute_batch(
                "
                PRAGMA foreign_keys = ON;
                PRAGMA journal_mode = WAL;
                PRAGMA synchronous = NORMAL;
                ",
            )
            .map_err(to_message)?;
        migrate(&connection).map_err(to_message)?;
        ensure_default_settings(&connection).map_err(to_message)?;
        ensure_default_categories(&connection).map_err(to_message)?;
        ensure_default_preferences(&connection).map_err(to_message)?;

        let state = Self {
            connection: Mutex::new(connection),
            paths,
        };
        state.log("storage initialized")?;
        state.create_startup_backup_if_needed()?;

        Ok(state)
    }

    fn log(&self, message: &str) -> Result<(), String> {
        let timestamp = Utc::now().to_rfc3339();
        let log_path = self.paths.logs_dir.join("app.log");
        let mut file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path)
            .map_err(to_message)?;

        writeln!(file, "{timestamp} {message}").map_err(to_message)
    }

    fn create_startup_backup_if_needed(&self) -> Result<(), String> {
        let conn = self
            .connection
            .lock()
            .map_err(|_| "Database bloccato.".to_string())?;
        let movement_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM movements", [], |row| row.get(0))
            .map_err(to_message)?;
        let goal_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM goals", [], |row| row.get(0))
            .map_err(to_message)?;
        drop(conn);

        if movement_count > 0 || goal_count > 0 {
            create_auto_backup_for_state(self)?;
        }

        Ok(())
    }
}

fn init_portable_paths() -> Result<PortablePaths, String> {
    let current_exe = std::env::current_exe().map_err(to_message)?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| "Impossibile determinare la cartella dell'app.".to_string())?
        .to_path_buf();
    let data_dir = exe_dir.join("data");
    let backups_dir = exe_dir.join("backups");
    let logs_dir = exe_dir.join("logs");
    let database_path = data_dir.join("fondi-e-tasse.sqlite");

    fs::create_dir_all(&data_dir).map_err(to_message)?;
    fs::create_dir_all(&backups_dir).map_err(to_message)?;
    fs::create_dir_all(&logs_dir).map_err(to_message)?;

    let write_test = data_dir.join(".write-test");
    fs::write(&write_test, b"ok").map_err(|error| {
        format!(
            "La cartella dati non e scrivibile: {}. Sposta l'app in una cartella utente.",
            error
        )
    })?;
    fs::remove_file(write_test).map_err(to_message)?;

    Ok(PortablePaths {
        exe_dir,
        data_dir,
        backups_dir,
        logs_dir,
        database_path,
        writable: true,
    })
}

fn migrate(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            taxable_coefficient REAL NOT NULL,
            substitute_tax_rate REAL NOT NULL,
            pension_rate REAL NOT NULL,
            pension_minimum REAL NOT NULL,
            integrative_rate REAL NOT NULL,
            integrative_minimum REAL NOT NULL,
            activity_year INTEGER NOT NULL,
            setup_completed INTEGER NOT NULL DEFAULT 0,
            enforce_minimums_when_empty INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS movements (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('collected', 'pending', 'paid', 'to_pay')),
            notes TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
        CREATE INDEX IF NOT EXISTS idx_movements_type_category_status ON movements(type, category, status);

        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            saved_amount REAL NOT NULL,
            target_date TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            name TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_categories_type_name ON categories(type, name);

        CREATE TABLE IF NOT EXISTS deadlines (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            category TEXT NOT NULL,
            recurrence TEXT NOT NULL CHECK (recurrence IN ('none', 'monthly', 'yearly')),
            notes TEXT NOT NULL DEFAULT '',
            completed_occurrences TEXT NOT NULL DEFAULT '[]'
        );
        CREATE INDEX IF NOT EXISTS idx_deadlines_date ON deadlines(date);

        CREATE TABLE IF NOT EXISTS preferences (
            id TEXT PRIMARY KEY,
            safety_threshold_amount REAL
        );

        CREATE TABLE IF NOT EXISTS meta (
            id TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        ",
    )
}

fn ensure_default_settings(conn: &Connection) -> rusqlite::Result<()> {
    let existing: Option<String> = conn
        .query_row("SELECT id FROM settings WHERE id = 'default'", [], |row| {
            row.get(0)
        })
        .optional()?;

    if existing.is_none() {
        let profile = default_stored_profile();
        upsert_profile(conn, &profile)?;
    }

    Ok(())
}

fn ensure_default_categories(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM categories", [], |row| row.get(0))?;

    if count == 0 {
        for category in default_categories() {
            upsert_category_row(conn, &category)?;
        }
    }

    Ok(())
}

fn ensure_default_preferences(conn: &Connection) -> rusqlite::Result<()> {
    let existing: Option<String> = conn
        .query_row(
            "SELECT id FROM preferences WHERE id = 'default'",
            [],
            |row| row.get(0),
        )
        .optional()?;

    if existing.is_none() {
        upsert_preferences(conn, &default_preferences())?;
    }

    Ok(())
}

fn default_stored_profile() -> StoredTaxProfile {
    StoredTaxProfile {
        id: "default".to_string(),
        taxable_coefficient: 0.78,
        substitute_tax_rate: 0.05,
        pension_rate: 0.1,
        pension_minimum: 856.0,
        integrative_rate: 0.02,
        integrative_minimum: 66.0,
        activity_year: 2,
        setup_completed: Some(false),
        enforce_minimums_when_empty: Some(true),
    }
}

fn default_categories() -> Vec<Category> {
    vec![
        category("Sedute", "income"),
        category("Supervisioni", "income"),
        category("Formazione", "income"),
        category("Altro", "income"),
        category("Spesa fissa", "expense"),
        category("Formazione", "expense"),
        category("Strumenti", "expense"),
        category("Altro", "expense"),
    ]
}

fn category(name: &str, category_type: &str) -> Category {
    Category {
        id: Some(Uuid::new_v4().to_string()),
        name: name.to_string(),
        category_type: category_type.to_string(),
    }
}

fn default_preferences() -> AppPreferences {
    AppPreferences {
        id: Some("default".to_string()),
        safety_threshold_amount: None,
    }
}

fn read_app_data(conn: &Connection) -> rusqlite::Result<AppData> {
    Ok(AppData {
        movements: read_movements(conn)?,
        goals: read_goals(conn)?,
        profile: read_profile(conn)?.unwrap_or_else(default_stored_profile),
        categories: read_categories(conn)?,
        deadlines: read_deadlines(conn)?,
        preferences: read_preferences(conn)?.unwrap_or_else(default_preferences),
    })
}

fn read_movements(conn: &Connection) -> rusqlite::Result<Vec<Movement>> {
    let mut statement = conn.prepare(
        "
        SELECT id, date, type, description, category, amount, status, notes
        FROM movements
        ORDER BY date DESC
        ",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Movement {
            id: Some(row.get(0)?),
            date: row.get(1)?,
            movement_type: row.get(2)?,
            description: row.get(3)?,
            category: row.get(4)?,
            amount: row.get(5)?,
            status: row.get(6)?,
            notes: Some(row.get(7)?),
        })
    })?;

    rows.collect()
}

fn read_goals(conn: &Connection) -> rusqlite::Result<Vec<Goal>> {
    let mut statement = conn.prepare(
        "
        SELECT id, name, target_amount, saved_amount, target_date
        FROM goals
        ORDER BY target_date ASC
        ",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Goal {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            target_amount: row.get(2)?,
            saved_amount: row.get(3)?,
            target_date: row.get(4)?,
        })
    })?;

    rows.collect()
}

fn read_profile(conn: &Connection) -> rusqlite::Result<Option<StoredTaxProfile>> {
    conn.query_row(
        "
        SELECT id, taxable_coefficient, substitute_tax_rate, pension_rate, pension_minimum,
               integrative_rate, integrative_minimum, activity_year, setup_completed,
               enforce_minimums_when_empty
        FROM settings
        WHERE id = 'default'
        ",
        [],
        |row| {
            Ok(StoredTaxProfile {
                id: row.get(0)?,
                taxable_coefficient: row.get(1)?,
                substitute_tax_rate: row.get(2)?,
                pension_rate: row.get(3)?,
                pension_minimum: row.get(4)?,
                integrative_rate: row.get(5)?,
                integrative_minimum: row.get(6)?,
                activity_year: row.get(7)?,
                setup_completed: Some(row.get::<_, i64>(8)? == 1),
                enforce_minimums_when_empty: Some(row.get::<_, i64>(9)? == 1),
            })
        },
    )
    .optional()
}

fn read_categories(conn: &Connection) -> rusqlite::Result<Vec<Category>> {
    let mut statement = conn.prepare(
        "
        SELECT id, name, type
        FROM categories
        ORDER BY name ASC
        ",
    )?;
    let rows = statement.query_map([], |row| {
        Ok(Category {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            category_type: row.get(2)?,
        })
    })?;

    rows.collect()
}

fn read_deadlines(conn: &Connection) -> rusqlite::Result<Vec<PersonalDeadline>> {
    let mut statement = conn.prepare(
        "
        SELECT id, title, date, category, recurrence, notes, completed_occurrences
        FROM deadlines
        ORDER BY date ASC
        ",
    )?;
    let rows = statement.query_map([], |row| {
        let completed_json: String = row.get(6)?;
        let completed_occurrences =
            serde_json::from_str::<Vec<String>>(&completed_json).unwrap_or_default();

        Ok(PersonalDeadline {
            id: Some(row.get(0)?),
            title: row.get(1)?,
            date: row.get(2)?,
            category: row.get(3)?,
            recurrence: row.get(4)?,
            notes: Some(row.get(5)?),
            completed_occurrences: Some(completed_occurrences),
        })
    })?;

    rows.collect()
}

fn read_preferences(conn: &Connection) -> rusqlite::Result<Option<AppPreferences>> {
    conn.query_row(
        "
        SELECT id, safety_threshold_amount
        FROM preferences
        WHERE id = 'default'
        ",
        [],
        |row| {
            Ok(AppPreferences {
                id: Some(row.get(0)?),
                safety_threshold_amount: row.get(1)?,
            })
        },
    )
    .optional()
}

fn upsert_profile(conn: &Connection, profile: &StoredTaxProfile) -> rusqlite::Result<()> {
    conn.execute(
        "
        INSERT INTO settings (
            id, taxable_coefficient, substitute_tax_rate, pension_rate, pension_minimum,
            integrative_rate, integrative_minimum, activity_year, setup_completed,
            enforce_minimums_when_empty
        ) VALUES ('default', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(id) DO UPDATE SET
            taxable_coefficient = excluded.taxable_coefficient,
            substitute_tax_rate = excluded.substitute_tax_rate,
            pension_rate = excluded.pension_rate,
            pension_minimum = excluded.pension_minimum,
            integrative_rate = excluded.integrative_rate,
            integrative_minimum = excluded.integrative_minimum,
            activity_year = excluded.activity_year,
            setup_completed = excluded.setup_completed,
            enforce_minimums_when_empty = excluded.enforce_minimums_when_empty
        ",
        params![
            profile.taxable_coefficient,
            profile.substitute_tax_rate,
            profile.pension_rate,
            profile.pension_minimum,
            profile.integrative_rate,
            profile.integrative_minimum,
            profile.activity_year,
            bool_to_i64(profile.setup_completed.unwrap_or(false)),
            bool_to_i64(profile.enforce_minimums_when_empty.unwrap_or(true)),
        ],
    )?;

    Ok(())
}

fn upsert_profile_from_tax_profile(
    conn: &Connection,
    profile: &TaxProfile,
) -> rusqlite::Result<()> {
    let stored = StoredTaxProfile {
        id: "default".to_string(),
        taxable_coefficient: profile.taxable_coefficient,
        substitute_tax_rate: profile.substitute_tax_rate,
        pension_rate: profile.pension_rate,
        pension_minimum: profile.pension_minimum,
        integrative_rate: profile.integrative_rate,
        integrative_minimum: profile.integrative_minimum,
        activity_year: profile.activity_year,
        setup_completed: profile.setup_completed,
        enforce_minimums_when_empty: profile.enforce_minimums_when_empty,
    };

    upsert_profile(conn, &stored)
}

fn upsert_movement_row(conn: &Connection, movement: &Movement) -> rusqlite::Result<String> {
    let id = movement
        .id
        .clone()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        "
        INSERT INTO movements (id, date, type, description, category, amount, status, notes)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            date = excluded.date,
            type = excluded.type,
            description = excluded.description,
            category = excluded.category,
            amount = excluded.amount,
            status = excluded.status,
            notes = excluded.notes
        ",
        params![
            id,
            movement.date,
            movement.movement_type,
            movement.description,
            movement.category,
            movement.amount,
            movement.status,
            movement.notes.clone().unwrap_or_default(),
        ],
    )?;

    Ok(id)
}

fn upsert_goal_row(conn: &Connection, goal: &Goal) -> rusqlite::Result<String> {
    let id = goal
        .id
        .clone()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        "
        INSERT INTO goals (id, name, target_amount, saved_amount, target_date)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            target_amount = excluded.target_amount,
            saved_amount = excluded.saved_amount,
            target_date = excluded.target_date
        ",
        params![
            id,
            goal.name,
            goal.target_amount,
            goal.saved_amount,
            goal.target_date
        ],
    )?;

    Ok(id)
}

fn upsert_category_row(conn: &Connection, category: &Category) -> rusqlite::Result<String> {
    let id = category
        .id
        .clone()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    conn.execute(
        "
        INSERT INTO categories (id, type, name)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(id) DO UPDATE SET
            type = excluded.type,
            name = excluded.name
        ",
        params![id, category.category_type, category.name],
    )?;

    Ok(id)
}

fn upsert_deadline_row(conn: &Connection, deadline: &PersonalDeadline) -> rusqlite::Result<String> {
    let id = deadline
        .id
        .clone()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let completed =
        serde_json::to_string(&deadline.completed_occurrences.clone().unwrap_or_default())
            .map_err(|error| rusqlite::Error::ToSqlConversionFailure(Box::new(error)))?;

    conn.execute(
        "
        INSERT INTO deadlines (id, title, date, category, recurrence, notes, completed_occurrences)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            date = excluded.date,
            category = excluded.category,
            recurrence = excluded.recurrence,
            notes = excluded.notes,
            completed_occurrences = excluded.completed_occurrences
        ",
        params![
            id,
            deadline.title,
            deadline.date,
            deadline.category,
            deadline.recurrence,
            deadline.notes.clone().unwrap_or_default(),
            completed,
        ],
    )?;

    Ok(id)
}

fn upsert_preferences(conn: &Connection, preferences: &AppPreferences) -> rusqlite::Result<()> {
    conn.execute(
        "
        INSERT INTO preferences (id, safety_threshold_amount)
        VALUES ('default', ?1)
        ON CONFLICT(id) DO UPDATE SET
            safety_threshold_amount = excluded.safety_threshold_amount
        ",
        params![preferences.safety_threshold_amount],
    )?;

    Ok(())
}

fn build_backup_payload(conn: &Connection) -> rusqlite::Result<BackupPayload> {
    Ok(BackupPayload {
        meta: BackupMeta {
            app: "fondi-e-tasse".to_string(),
            version: 4,
            exported_at: Utc::now().to_rfc3339(),
        },
        movements: read_movements(conn)?,
        goals: read_goals(conn)?,
        settings: read_profile(conn)?.unwrap_or_else(default_stored_profile),
        categories: read_categories(conn)?,
        deadlines: read_deadlines(conn)?,
        preferences: read_preferences(conn)?.unwrap_or_else(default_preferences),
    })
}

fn replace_data_from_backup(tx: &Transaction<'_>, payload: &BackupPayload) -> rusqlite::Result<()> {
    tx.execute("DELETE FROM movements", [])?;
    tx.execute("DELETE FROM goals", [])?;
    tx.execute("DELETE FROM categories", [])?;
    tx.execute("DELETE FROM deadlines", [])?;
    upsert_profile(tx, &payload.settings)?;
    upsert_preferences(tx, &payload.preferences)?;

    for movement in &payload.movements {
        upsert_movement_row(tx, movement)?;
    }
    for goal in &payload.goals {
        upsert_goal_row(tx, goal)?;
    }
    for category in &payload.categories {
        upsert_category_row(tx, category)?;
    }
    for deadline in &payload.deadlines {
        upsert_deadline_row(tx, deadline)?;
    }
    tx.execute(
        "INSERT INTO meta (id, value) VALUES ('migrationCompleted', 'true')
         ON CONFLICT(id) DO UPDATE SET value = excluded.value",
        [],
    )?;

    Ok(())
}

fn write_backup(
    paths: &PortablePaths,
    payload: &BackupPayload,
    file_name: &str,
) -> Result<BackupResult, String> {
    let final_path = paths.backups_dir.join(file_name);
    let tmp_path = paths.backups_dir.join(format!("{file_name}.tmp"));
    let json = serde_json::to_vec_pretty(payload).map_err(to_message)?;

    {
        let mut file = fs::File::create(&tmp_path).map_err(to_message)?;
        file.write_all(&json).map_err(to_message)?;
        file.sync_all().map_err(to_message)?;
    }

    fs::rename(&tmp_path, &final_path).map_err(to_message)?;

    Ok(BackupResult {
        path: final_path.to_string_lossy().to_string(),
        file_name: file_name.to_string(),
    })
}

fn create_auto_backup_for_state(state: &DbState) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let payload = build_backup_payload(&conn).map_err(to_message)?;
    let now = Utc::now();
    let daily_name = format!("auto-daily-{}.json", now.format("%Y-%m-%d"));
    let weekly_name = format!(
        "auto-weekly-{}-W{:02}.json",
        now.year(),
        now.iso_week().week()
    );

    write_backup(&state.paths, &payload, &daily_name)?;
    write_backup(&state.paths, &payload, &weekly_name)?;
    rotate_backups(&state.paths.backups_dir, "auto-daily-", 7)?;
    rotate_backups(&state.paths.backups_dir, "auto-weekly-", 4)?;
    drop(conn);
    state.log("auto backup created")?;

    Ok(())
}

fn rotate_backups(backups_dir: &PathBuf, prefix: &str, keep: usize) -> Result<(), String> {
    let mut files = fs::read_dir(backups_dir)
        .map_err(to_message)?
        .filter_map(Result::ok)
        .filter(|entry| entry.file_name().to_string_lossy().starts_with(prefix))
        .collect::<Vec<_>>();

    files.sort_by_key(|entry| entry.file_name());

    let remove_count = files.len().saturating_sub(keep);
    for entry in files.into_iter().take(remove_count) {
        fs::remove_file(entry.path()).map_err(to_message)?;
    }

    Ok(())
}

fn to_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

fn bool_to_i64(value: bool) -> i64 {
    if value {
        1
    } else {
        0
    }
}

#[tauri::command]
fn portable_diagnostics(state: tauri::State<'_, DbState>) -> PortableDiagnostics {
    PortableDiagnostics {
        exe_dir: state.paths.exe_dir.to_string_lossy().to_string(),
        data_dir: state.paths.data_dir.to_string_lossy().to_string(),
        backups_dir: state.paths.backups_dir.to_string_lossy().to_string(),
        logs_dir: state.paths.logs_dir.to_string_lossy().to_string(),
        database_path: state.paths.database_path.to_string_lossy().to_string(),
        writable: state.paths.writable,
    }
}

#[tauri::command]
fn get_app_data(state: tauri::State<'_, DbState>) -> Result<AppData, String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    read_app_data(&conn).map_err(to_message)
}

#[tauri::command]
fn save_profile(state: tauri::State<'_, DbState>, profile: TaxProfile) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    upsert_profile_from_tax_profile(&conn, &profile).map_err(to_message)?;
    drop(conn);
    state.log("profile saved")?;

    Ok(())
}

#[tauri::command]
fn create_movement(
    state: tauri::State<'_, DbState>,
    movement: Movement,
) -> Result<Movement, String> {
    upsert_movement_command(state, movement)
}

#[tauri::command]
fn upsert_movement(
    state: tauri::State<'_, DbState>,
    movement: Movement,
) -> Result<Movement, String> {
    upsert_movement_command(state, movement)
}

fn upsert_movement_command(
    state: tauri::State<'_, DbState>,
    mut movement: Movement,
) -> Result<Movement, String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let id = upsert_movement_row(&conn, &movement).map_err(to_message)?;
    movement.id = Some(id);
    drop(conn);
    state.log("movement saved")?;

    Ok(movement)
}

#[tauri::command]
fn delete_movement(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    conn.execute("DELETE FROM movements WHERE id = ?1", params![id])
        .map_err(to_message)?;
    drop(conn);
    state.log("movement deleted")?;

    Ok(())
}

#[tauri::command]
fn create_goal(state: tauri::State<'_, DbState>, goal: Goal) -> Result<Goal, String> {
    upsert_goal_command(state, goal)
}

#[tauri::command]
fn upsert_goal(state: tauri::State<'_, DbState>, goal: Goal) -> Result<Goal, String> {
    upsert_goal_command(state, goal)
}

fn upsert_goal_command(state: tauri::State<'_, DbState>, mut goal: Goal) -> Result<Goal, String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let id = upsert_goal_row(&conn, &goal).map_err(to_message)?;
    goal.id = Some(id);
    drop(conn);
    state.log("goal saved")?;

    Ok(goal)
}

#[tauri::command]
fn delete_goal(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    conn.execute("DELETE FROM goals WHERE id = ?1", params![id])
        .map_err(to_message)?;
    drop(conn);
    state.log("goal deleted")?;

    Ok(())
}

#[tauri::command]
fn create_deadline(
    state: tauri::State<'_, DbState>,
    deadline: PersonalDeadline,
) -> Result<PersonalDeadline, String> {
    upsert_deadline_command(state, deadline)
}

#[tauri::command]
fn upsert_deadline(
    state: tauri::State<'_, DbState>,
    deadline: PersonalDeadline,
) -> Result<PersonalDeadline, String> {
    upsert_deadline_command(state, deadline)
}

fn upsert_deadline_command(
    state: tauri::State<'_, DbState>,
    mut deadline: PersonalDeadline,
) -> Result<PersonalDeadline, String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let id = upsert_deadline_row(&conn, &deadline).map_err(to_message)?;
    deadline.id = Some(id);
    drop(conn);
    state.log("deadline saved")?;

    Ok(deadline)
}

#[tauri::command]
fn delete_deadline(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    conn.execute("DELETE FROM deadlines WHERE id = ?1", params![id])
        .map_err(to_message)?;
    drop(conn);
    state.log("deadline deleted")?;

    Ok(())
}

#[tauri::command]
fn save_preferences(
    state: tauri::State<'_, DbState>,
    preferences: AppPreferences,
) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    upsert_preferences(&conn, &preferences).map_err(to_message)?;
    drop(conn);
    state.log("preferences saved")?;

    Ok(())
}

#[tauri::command]
fn create_category(
    state: tauri::State<'_, DbState>,
    mut category: Category,
) -> Result<Category, String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let id = upsert_category_row(&conn, &category).map_err(to_message)?;
    category.id = Some(id);
    drop(conn);
    state.log("category saved")?;

    Ok(category)
}

#[tauri::command]
fn delete_category(state: tauri::State<'_, DbState>, id: String) -> Result<(), String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])
        .map_err(to_message)?;
    drop(conn);
    state.log("category deleted")?;

    Ok(())
}

#[tauri::command]
fn export_backup(state: tauri::State<'_, DbState>) -> Result<BackupResult, String> {
    let conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let payload = build_backup_payload(&conn).map_err(to_message)?;
    let file_name = format!(
        "fondi-tasse-backup-{}.json",
        Utc::now().format("%Y-%m-%d-%H%M%S")
    );
    let result = write_backup(&state.paths, &payload, &file_name)?;
    drop(conn);
    state.log("manual backup exported")?;

    Ok(result)
}

#[tauri::command]
fn import_backup(state: tauri::State<'_, DbState>, payload: BackupPayload) -> Result<(), String> {
    if payload.meta.app != "fondi-e-tasse" || ![3, 4].contains(&payload.meta.version) {
        return Err("Backup non valido o non compatibile.".to_string());
    }

    let mut conn = state
        .connection
        .lock()
        .map_err(|_| "Database bloccato.".to_string())?;
    let before_payload = build_backup_payload(&conn).map_err(to_message)?;
    let before_name = format!("pre-import-{}.json", Utc::now().format("%Y-%m-%d-%H%M%S"));
    write_backup(&state.paths, &before_payload, &before_name)?;

    let tx = conn.transaction().map_err(to_message)?;
    replace_data_from_backup(&tx, &payload).map_err(to_message)?;
    tx.commit().map_err(to_message)?;
    drop(conn);
    state.log("backup imported")?;

    Ok(())
}

#[tauri::command]
fn create_auto_backup(state: tauri::State<'_, DbState>) -> Result<(), String> {
    create_auto_backup_for_state(&state)
}

#[tauri::command]
fn check_portable_update(
    state: tauri::State<'_, DbState>,
    current_version: String,
) -> Result<Option<PortableUpdateInfo>, String> {
    if find_portable_updater(&state.paths).is_err() {
        return Ok(None);
    }

    let Some(manifest) = fetch_portable_manifest()? else {
        return Ok(None);
    };
    let Some(platform) = manifest.platforms.get("windows-x86_64") else {
        return Ok(None);
    };

    if !is_version_newer(&manifest.version, &current_version) {
        return Ok(None);
    }

    Ok(Some(PortableUpdateInfo {
        version: manifest.version,
        notes: manifest.notes,
        pub_date: manifest.pub_date,
        url: platform.url.clone(),
        sha256: platform.sha256.clone(),
        size: platform.size,
        signature: platform.signature.clone(),
    }))
}

#[tauri::command]
fn read_last_update_error(
    state: tauri::State<'_, DbState>,
) -> Result<Option<String>, String> {
    let path = state.paths.exe_dir.join(".updates").join("last-error.txt");

    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&path).map_err(to_message)?;
    let _ = fs::remove_file(&path);
    let trimmed = content.trim();

    if trimmed.is_empty() {
        return Ok(None);
    }

    Ok(Some(trimmed.to_string()))
}

#[tauri::command]
fn install_portable_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, DbState>,
    update: PortableUpdateInfo,
) -> Result<(), String> {
    state.log(&format!(
        "portable update download started: {}",
        update.version
    ))?;
    let package_path = download_portable_package(&state.paths, &update)?;
    state.log(&format!(
        "portable update downloaded: {}",
        package_path.display()
    ))?;
    launch_portable_updater(&app, &state.paths, &package_path)?;
    state.log("portable updater launched")?;
    app.exit(0);

    Ok(())
}

fn fetch_portable_manifest() -> Result<Option<PortableUpdateManifest>, String> {
    let response = reqwest::blocking::get(PORTABLE_MANIFEST_URL).map_err(to_message)?;

    if response.status().as_u16() == 404 {
        return Ok(None);
    }

    if !response.status().is_success() {
        return Err(format!(
            "Manifest aggiornamenti portable non disponibile: HTTP {}.",
            response.status()
        ));
    }

    response
        .json::<PortableUpdateManifest>()
        .map(Some)
        .map_err(to_message)
}

fn download_portable_package(
    paths: &PortablePaths,
    update: &PortableUpdateInfo,
) -> Result<PathBuf, String> {
    let response = reqwest::blocking::get(&update.url).map_err(to_message)?;

    if !response.status().is_success() {
        return Err(format!(
            "Pacchetto aggiornamento non disponibile: HTTP {}.",
            response.status()
        ));
    }

    let bytes = response.bytes().map_err(to_message)?;
    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let digest = hex::encode(hasher.finalize());

    if !digest.eq_ignore_ascii_case(update.sha256.trim()) {
        return Err("Verifica SHA256 del pacchetto update non riuscita.".to_string());
    }

    verify_portable_signature(&bytes, &update.signature)?;

    let updates_dir = paths.exe_dir.join(".updates");
    fs::create_dir_all(&updates_dir).map_err(to_message)?;
    let package_path = updates_dir.join(format!("taxa-desk-{}-update.zip", update.version));
    fs::write(&package_path, &bytes).map_err(to_message)?;

    Ok(package_path)
}

fn verify_portable_signature(bytes: &[u8], signature_text: &str) -> Result<(), String> {
    let trimmed = signature_text.trim();

    if trimmed.is_empty() {
        return Err("Firma del pacchetto update mancante.".to_string());
    }

    let public_key = minisign_verify::PublicKey::from_base64(PORTABLE_UPDATER_PUBKEY_BASE64)
        .map_err(|error| format!("Chiave pubblica updater non valida: {error}"))?;
    let signature = minisign_verify::Signature::decode(trimmed)
        .map_err(|error| format!("Firma updater non valida: {error}"))?;

    public_key
        .verify(bytes, &signature, false)
        .map_err(|_| "Verifica firma del pacchetto update non riuscita.".to_string())
}

fn launch_portable_updater(
    app: &tauri::AppHandle,
    paths: &PortablePaths,
    package_path: &PathBuf,
) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(to_message)?;
    let app_exe_name = current_exe
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Nome eseguibile app non disponibile.".to_string())?;
    let updater_path = find_portable_updater(paths)?;
    let pid = std::process::id().to_string();
    let log_path = paths.logs_dir.join("app.log");

    Command::new(updater_path)
        .arg("--app-dir")
        .arg(&paths.exe_dir)
        .arg("--package")
        .arg(package_path)
        .arg("--pid")
        .arg(pid)
        .arg("--exe")
        .arg(app_exe_name)
        .arg("--log")
        .arg(log_path)
        .current_dir(&paths.exe_dir)
        .spawn()
        .map_err(to_message)?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }

    Ok(())
}

fn find_portable_updater(paths: &PortablePaths) -> Result<PathBuf, String> {
    let candidates = [
        paths.exe_dir.join("Taxa Desk Updater.exe"),
        paths.exe_dir.join("taxa-desk-updater.exe"),
    ];

    candidates
        .into_iter()
        .find(|path| path.exists())
        .ok_or_else(|| "Taxa Desk Updater.exe non trovato nella cartella dell’app.".to_string())
}

fn is_version_newer(candidate: &str, current: &str) -> bool {
    parse_version(candidate) > parse_version(current)
}

fn parse_version(version: &str) -> Vec<u64> {
    version
        .split('.')
        .map(|part| part.parse::<u64>().unwrap_or(0))
        .collect()
}

#[tauri::command]
fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(to_message)
}

#[tauri::command]
fn window_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().map_err(to_message)? {
        window.unmaximize().map_err(to_message)
    } else {
        window.maximize().map_err(to_message)
    }
}

#[tauri::command]
fn window_close(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(to_message)
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_opener::init())?;

            let state = DbState::open().map_err(|message| {
                let error = std::io::Error::new(std::io::ErrorKind::Other, message);
                Box::<dyn std::error::Error>::from(error)
            })?;
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            portable_diagnostics,
            get_app_data,
            save_profile,
            create_movement,
            upsert_movement,
            delete_movement,
            create_goal,
            upsert_goal,
            delete_goal,
            create_deadline,
            upsert_deadline,
            delete_deadline,
            save_preferences,
            create_category,
            delete_category,
            export_backup,
            import_backup,
            create_auto_backup,
            check_portable_update,
            install_portable_update,
            read_last_update_error,
            window_minimize,
            window_toggle_maximize,
            window_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
