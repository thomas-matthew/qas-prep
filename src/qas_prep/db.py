"""SQLite storage on the host (DAT-06, DAT-07). One file, data/qas.db.

Schema changes are additive only, so updating the app never touches saved history (DAT-08)."""
import json
import shutil
import sqlite3
import time
from datetime import datetime
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, tutor_opt_in INTEGER NOT NULL DEFAULT 0,
    created REAL NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    t INTEGER NOT NULL, data TEXT NOT NULL, UNIQUE(profile_id, t));
CREATE TABLE IF NOT EXISTS flags (
    id INTEGER PRIMARY KEY, qid TEXT NOT NULL, profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    note TEXT NOT NULL DEFAULT '', created REAL NOT NULL, rechecked REAL);
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY, profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, ref TEXT NOT NULL, title TEXT NOT NULL, context TEXT NOT NULL,
    sdk_session TEXT, created REAL NOT NULL, updated REAL NOT NULL);
CREATE INDEX IF NOT EXISTS conv_ref ON conversations(profile_id, kind, ref);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY, conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, text TEXT NOT NULL, created REAL NOT NULL);
"""


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA journal_mode = WAL")
    con.executescript(SCHEMA)
    return con


# ---------- profiles ----------
def profiles(con) -> list[dict]:
    rows = con.execute("SELECT p.id, p.name, p.tutor_opt_in, COUNT(a.id) AS tests FROM profiles p "
                       "LEFT JOIN attempts a ON a.profile_id = p.id GROUP BY p.id ORDER BY p.created").fetchall()
    return [{"id": r["id"], "name": r["name"], "tutorOptIn": bool(r["tutor_opt_in"]), "tests": r["tests"]} for r in rows]


def profile(con, pid: int) -> dict | None:
    return next((p for p in profiles(con) if p["id"] == pid), None)


def add_profile(con, name: str) -> int:
    return con.execute("INSERT INTO profiles (name, created) VALUES (?, ?)", (name, time.time())).lastrowid


def rename_profile(con, pid: int, name: str) -> None:
    con.execute("UPDATE profiles SET name = ? WHERE id = ?", (name, pid))


def delete_profile(con, pid: int) -> None:
    con.execute("DELETE FROM profiles WHERE id = ?", (pid,))


def set_opt_in(con, pid: int, on: bool) -> None:
    con.execute("UPDATE profiles SET tutor_opt_in = ? WHERE id = ?", (int(on), pid))


# ---------- attempts ----------
def attempts(con, pid: int) -> list[dict]:
    rows = con.execute("SELECT id, data FROM attempts WHERE profile_id = ? ORDER BY t", (pid,)).fetchall()
    return [{**json.loads(r["data"]), "id": r["id"]} for r in rows]


def attempt(con, pid: int, aid: int) -> dict | None:
    r = con.execute("SELECT id, data FROM attempts WHERE profile_id = ? AND id = ?", (pid, aid)).fetchone()
    return {**json.loads(r["data"]), "id": r["id"]} if r else None


def add_attempt(con, pid: int, data: dict) -> int:
    """Saving the same test twice (a retry after a failed save) keeps one copy."""
    data = {k: v for k, v in data.items() if k != "id"}
    con.execute("INSERT OR IGNORE INTO attempts (profile_id, t, data) VALUES (?, ?, ?)",
                (pid, int(data["t"]), json.dumps(data, separators=(",", ":"))))
    return con.execute("SELECT id FROM attempts WHERE profile_id = ? AND t = ?", (pid, int(data["t"]))).fetchone()["id"]


def clear_attempts(con, pid: int) -> int:
    """DAT-12: tests, analytics and the seen-question record all come from attempts, so this clears them all.
    Tutor conversations about those tests go too."""
    n = con.execute("DELETE FROM attempts WHERE profile_id = ?", (pid,)).rowcount
    con.execute("DELETE FROM conversations WHERE profile_id = ? AND ref NOT LIKE 'drill:%'", (pid,))
    return n


# ---------- flags (PLT-07) ----------
def flags(con, open_only: bool = False) -> list[dict]:
    sql = ("SELECT f.id, f.qid, f.note, f.created, f.rechecked, p.name AS who FROM flags f "
           "LEFT JOIN profiles p ON p.id = f.profile_id")
    if open_only:
        sql += " WHERE f.rechecked IS NULL"
    return [dict(r) for r in con.execute(sql + " ORDER BY f.created DESC")]


def add_flag(con, qid: str, pid: int | None, note: str) -> int:
    return con.execute("INSERT INTO flags (qid, profile_id, note, created) VALUES (?, ?, ?, ?)",
                       (qid, pid, note, time.time())).lastrowid


def recheck_flag(con, qid: str) -> int:
    """Marks every open flag on one question as rechecked, so it can appear in tests again."""
    return con.execute("UPDATE flags SET rechecked = ? WHERE qid = ? AND rechecked IS NULL",
                       (time.time(), qid)).rowcount


# ---------- tutor conversations ----------
def conversations(con, pid: int, kind: str | None = None, ref: str | None = None) -> list[dict]:
    sql, args = "SELECT id, kind, ref, title, created, updated FROM conversations WHERE profile_id = ?", [pid]
    if kind:
        sql += " AND kind = ?"; args.append(kind)
    if ref:
        sql += " AND ref = ?"; args.append(ref)
    return [dict(r) for r in con.execute(sql + " ORDER BY updated DESC", args)]


def conversation(con, cid: int) -> dict | None:
    r = con.execute("SELECT * FROM conversations WHERE id = ?", (cid,)).fetchone()
    if not r:
        return None
    c = dict(r)
    c["context"] = json.loads(c["context"])
    c["messages"] = [dict(m) for m in con.execute(
        "SELECT role, text, created FROM messages WHERE conversation_id = ? ORDER BY id", (cid,))]
    return c


def add_conversation(con, pid: int, kind: str, ref: str, title: str, context: dict) -> int:
    now = time.time()
    return con.execute("INSERT INTO conversations (profile_id, kind, ref, title, context, created, updated) "
                       "VALUES (?, ?, ?, ?, ?, ?, ?)", (pid, kind, ref, title, json.dumps(context), now, now)).lastrowid


def add_message(con, cid: int, role: str, text: str) -> None:
    now = time.time()
    con.execute("INSERT INTO messages (conversation_id, role, text, created) VALUES (?, ?, ?, ?)", (cid, role, text, now))
    con.execute("UPDATE conversations SET updated = ? WHERE id = ?", (now, cid))


def set_sdk_session(con, cid: int, session: str | None) -> None:
    con.execute("UPDATE conversations SET sdk_session = ? WHERE id = ?", (session, cid))


# ---------- export / import (DAT-10) ----------
def export_profile(con, pid: int) -> dict:
    p = profile(con, pid)
    return {"format": "qas-prep-history", "version": 1, "exported": datetime.now().isoformat(timespec="seconds"),
            "profile": p["name"] if p else None, "attempts": [{k: v for k, v in a.items() if k != "id"} for a in attempts(con, pid)]}


def import_profile(con, pid: int, payload: dict) -> int:
    if payload.get("format") != "qas-prep-history" or not isinstance(payload.get("attempts"), list):
        raise ValueError("This file is not a QAS Prep history export.")
    before = len(attempts(con, pid))
    for a in payload["attempts"]:
        if isinstance(a, dict) and "t" in a and "score" in a:
            add_attempt(con, pid, a)
    return len(attempts(con, pid)) - before


# ---------- backups (PLT-04) ----------
def backup(con, folder: Path, keep: int) -> Path:
    """A consistent copy of the live database, safe while the app is running. Keeps the newest `keep` copies."""
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now()
    dest = folder / f"qas-{stamp:%Y%m%d-%H%M%S}.db"
    if dest.exists():  # two backups in one second (a restore right after a backup) must not overwrite
        dest = folder / f"qas-{stamp:%Y%m%d-%H%M%S}-{stamp:%f}.db"
    out = sqlite3.connect(dest)
    try:
        con.backup(out)
    finally:
        out.close()
    for old in sorted(folder.glob("qas-*.db"))[:-keep]:
        old.unlink()
    return dest


def latest_backup(folder: Path) -> Path | None:
    files = sorted(folder.glob("qas-*.db"))
    return files[-1] if files else None


def restore(con, source: Path, folder: Path, keep: int) -> Path:
    """Replace the live data with a backup. The current data is backed up first, so a restore can be undone."""
    safety = backup(con, folder, keep + 1)
    src = sqlite3.connect(source)
    try:
        src.backup(con)
    finally:
        src.close()
    return safety


def copy_file(src: Path, dest: Path) -> None:
    shutil.copy2(src, dest)
