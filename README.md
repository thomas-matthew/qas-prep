# QAS Prep

Adaptive practice tests for the ACCUPLACER Quantitative Reasoning, Algebra, and Statistics (QAS) test, with worked solutions, progress analytics and a Claude tutor. It runs on a Mac and is used from any browser on the same Wi‑Fi network.

Scores are practice estimates, not official ACCUPLACER scores. All 1,211 questions are original.

## What it does

- **Adaptive test.** 20 questions, one at a time, untimed, no going back. After each answer the engine re-estimates ability (3PL item response theory) and picks the most informative next question that keeps the official topic mix. A calculator appears only on questions that allow one.
- **Results.** A score on the 200–300 scale with its band and likely range, a chart of how the test adapted, a by-topic table, and a step-by-step solution for every question. Any past test's full review can be reopened.
- **Progress.** Score trend, insights, a topic-by-test heatmap, topic vs. expected accuracy, success by question level, most-missed question types, and 8-question topic drills with instant feedback.
- **Tutor.** "Ask the tutor" on any reviewed question, "Review my mistakes with the tutor" on a results page, and "Make me a study plan" on the progress page and each topic. The tutor starts with the question, its figure (sent as an image), the choices, your answer and the worked solution already in place. Conversations are saved and reopen from the same question or test. Practice questions the tutor writes are marked "Not verified". The tutor is off during a test.
- **Profiles.** Each person has their own history. Switch or add profiles from the top right.
- **Flags.** "Flag this question" on any reviewed question keeps it out of tests until it is marked rechecked (on the progress page, or with `qas-prep recheck`).
- **Your data.** History lives in `data/qas.db` on the Mac, so every device sees the same history. It is backed up daily to `data/backups/` (the last 14 are kept). The progress page exports and imports history as JSON.

The full requirements are in the QAS Adaptive Practice requirements doc.

## Setup

Requires macOS, [uv](https://docs.astral.sh/uv/), and a Claude subscription for the tutor. Node is only needed to run the engine simulation test.

```bash
git clone <this repo> qas-prep
cd qas-prep
uv sync
```

Python and every package stay in this folder's `.venv/`.

### Log the tutor in to Claude

The tutor runs through the Claude Agent SDK, which `uv sync` installs with its own copy of the Claude Code CLI, and uses your Claude subscription. If Claude Code is already logged in on this Mac, that login is used. Otherwise:

```bash
uv run qas-prep claude-login
```

Type `/login`, finish in the browser, then `/exit`. To use an API key instead, put `QAS_USE_API_KEY=1` and `ANTHROPIC_API_KEY=...` in a `.env` file in this folder.

Nothing is sent to Claude until a profile turns the tutor on, and then only the question, test or progress summary being asked about. Everything else works without it, offline included.

### Run it

```bash
uv run qas-prep serve
```

It prints the addresses to open, such as `http://Your-Mac.local:8770`. Bookmark that address on the laptop. The first time, macOS may ask whether Python may accept incoming connections: allow it, or other devices cannot connect.

To keep it running in the background and start it at login:

```bash
uv run qas-prep install-service
```

It shows as **QAS Prep** in System Settings, then General, then Login Items: the agent starts a small launcher script with that name in `data/service/`, which then starts the app's Python. Logs go to `data/logs/serve.log`. After pulling an update, run `uv run qas-prep restart`. `uv run qas-prep uninstall-service` removes the background service; saved history stays.

The server only answers requests from this Mac and private networks (home Wi‑Fi, Tailscale). Don't forward the port on your router.

### Check everything

```bash
uv run qas-prep doctor
```

## Commands

| Command | What it does |
|---|---|
| `serve` | Run the app in this terminal |
| `install-service` / `uninstall-service` / `restart` | Manage the background service |
| `backup` | Back up the history now |
| `restore latest` / `restore list` / `restore <file>` | Restore history from a backup. The current data is backed up first. |
| `flags` / `recheck <id>` | List flagged questions; clear a flag after checking the question, for example `recheck RN1#3` |
| `claude-login` | Log the tutor in to Claude |
| `doctor` | Check the bank, database, backups and tutor |

Run each as `uv run qas-prep <command>`.

## Settings

Optional, in `.env` or the environment:

| Setting | Default | |
|---|---|---|
| `QAS_PORT` | `8770` | Port to listen on |
| `QAS_HOST` | `0.0.0.0` | Address to listen on. `127.0.0.1` keeps it on this Mac only. |
| `QAS_DATA_DIR` | `./data` | Where the database, backups and logs go |
| `QAS_TUTOR_MODEL` | `sonnet` | Claude model for the tutor (`sonnet`, `opus` or a full model id) |
| `QAS_KEEP_BACKUPS` | `14` | Daily backups to keep |
| `QAS_USE_API_KEY` | off | `1` to use `ANTHROPIC_API_KEY` instead of the subscription login |

## Updating and rolling back

Updates never touch `data/`: schema changes only add tables and columns. If an update breaks something, check out the previous commit and run `uv run qas-prep restart`. If the data itself needs to go back, use `restore`.

## Layout

```
src/qas_prep/
  app.py        web server and JSON API (FastAPI)
  db.py         SQLite storage, export/import, backups
  tutor.py      the Claude tutor: context, streaming, resumed sessions
  bank.py       question bank access; question text and figures for the tutor
  cli.py        the qas-prep command
  bank.json     the 1,211 verified questions
  types.json    question-type names, key ideas, difficulty (generated from web/items.js)
  web/          the browser app: engine, test, results, progress, tutor panel
scripts/
  simulate.cjs     runs the engine headlessly against thousands of simulated learners
  driver.js        drives a full test through the real page (used for end-to-end checks)
  export_types.cjs regenerates types.json after editing web/items.js
tests/          pytest suite
```

## Tests

```bash
uv run pytest
node scripts/simulate.cjs 3000
```

The simulation checks the topic mix on every test, score accuracy against known ability, and that 10 tests in a row never repeat a question.
