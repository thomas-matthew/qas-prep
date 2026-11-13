import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from qas_prep import bank, db, tutor
from qas_prep.app import create_app
from qas_prep.config import ROOT, Settings


@pytest.fixture
def client(tmp_path):
    s = Settings(host="127.0.0.1", port=0, data_dir=tmp_path, tutor_model="sonnet", keep_backups=3, use_api_key=False)
    with TestClient(create_app(s)) as c:
        c.settings = s
        yield c


def attempt(t=1_700_000_000_000, wrong=(3,)):
    qs = [(tid, v[0]) for tid, v in list(bank.questions().items())[:20]]
    items = [{"id": tid, "k": q["k"], "c": bank.types()[tid]["cat"], "b": bank.types()[tid]["b"], "a": 1.2,
              "u": 0 if i in wrong else 1, "ch": (q["ans"] + 1) % 4 if i in wrong else q["ans"]}
             for i, (tid, q) in enumerate(qs)]
    return {"t": t, "score": 255, "se": 0.3, "theta": 0.3, "items": items}


def profile(client, name="Ana"):
    r = client.post("/api/profiles", json={"name": name})
    assert r.status_code == 200, r.text
    return r.json()["id"]


# ---------- bank ----------
def test_bank_size_and_ids():
    assert bank.total() == 1211
    assert set(bank.questions()) == set(bank.types())
    q = bank.get("RN1#0")
    assert q and q["topic"] == "Rational numbers" and len(q["choices"]) == 4
    assert bank.get("RN1#9999") is None and bank.get("nope#1") is None


def test_every_question_renders_for_the_tutor():
    for tid, qs in bank.questions().items():
        for q in qs:
            text = bank.plain(q["q"])
            assert not re.search(r"</?[a-zA-Z][^>]*>", text), (tid, q["k"], text)
            if "<svg" in q["q"]:
                pngs = bank.figures(q["q"])
                assert pngs and all(p[:4] == b"\x89PNG" for p in pngs)


# ---------- pages and network ----------
def test_pages(client):
    assert "QAS Prep" in client.get("/").text
    js = client.get("/api/bank.js").text
    assert js.startswith("window.QAS_BANKDATA=") and "QAS_FLAGGED=[]" in js
    for f in ("items.js", "bankserve.js", "engine.js", "store.js", "tutor.js", "progress.js", "main.js", "app.css", "local.css"):
        assert client.get(f"/web/{f}").status_code == 200, f


def test_outside_network_refused(client):
    r = client.get("/api/profiles", headers={}, extensions={})
    assert r.status_code == 200
    app = client.app
    outside = TestClient(app, client=("8.8.8.8", 5000))
    assert outside.get("/api/profiles").status_code == 403
    lan = TestClient(app, client=("192.168.1.20", 5000))
    assert lan.get("/api/profiles").status_code == 200


# ---------- profiles and history ----------
def test_profiles_are_separate(client):
    a, b = profile(client, "Ana"), profile(client, "Ben")
    assert client.post("/api/profiles", json={"name": "ana"}).status_code == 409
    client.post(f"/api/profiles/{a}/attempts", json=attempt())
    assert len(client.get(f"/api/profiles/{a}/attempts").json()) == 1
    assert client.get(f"/api/profiles/{b}/attempts").json() == []
    assert [p["tests"] for p in client.get("/api/profiles").json()] == [1, 0]


def test_attempt_saved_once_and_validated(client):
    pid = profile(client)
    a = attempt()
    id1 = client.post(f"/api/profiles/{pid}/attempts", json=a).json()["id"]
    id2 = client.post(f"/api/profiles/{pid}/attempts", json=a).json()["id"]  # a retried save
    assert id1 == id2
    saved = client.get(f"/api/profiles/{pid}/attempts").json()
    assert len(saved) == 1 and saved[0]["items"][3]["ch"] is not None and saved[0]["id"] == id1
    bad = {**a, "items": a["items"][:5]}
    assert client.post(f"/api/profiles/{pid}/attempts", json=bad).status_code == 400


def test_clear_export_import(client):
    pid = profile(client)
    client.post(f"/api/profiles/{pid}/attempts", json=attempt(1))
    client.post(f"/api/profiles/{pid}/attempts", json=attempt(2))
    exported = client.get(f"/api/profiles/{pid}/export").json()
    assert exported["format"] == "qas-prep-history" and len(exported["attempts"]) == 2
    assert client.delete(f"/api/profiles/{pid}/attempts").json() == {"deleted": 2}
    assert client.get(f"/api/profiles/{pid}/attempts").json() == []
    assert client.post(f"/api/profiles/{pid}/import", json=exported).json() == {"added": 2}
    assert client.post(f"/api/profiles/{pid}/import", json=exported).json() == {"added": 0}
    assert client.post(f"/api/profiles/{pid}/import", json={"hello": 1}).status_code == 400


def test_history_survives_restart(client, tmp_path):
    pid = profile(client)
    client.post(f"/api/profiles/{pid}/attempts", json=attempt())
    with TestClient(create_app(client.settings)) as again:
        assert len(again.get(f"/api/profiles/{pid}/attempts").json()) == 1


# ---------- flags ----------
def test_flag_keeps_question_out_until_rechecked(client):
    pid = profile(client)
    assert client.post("/api/flags", json={"qid": "RN1#0", "note": "two answers", "profile": pid}).status_code == 200
    assert '"RN1#0"' in client.get("/api/bank.js").text
    assert client.get("/api/flags").json()[0]["name"] == bank.types()["RN1"]["name"]
    assert client.post("/api/flags/RN1%230/recheck").json() == {"cleared": 1}
    assert "QAS_FLAGGED=[]" in client.get("/api/bank.js").text
    assert client.post("/api/flags", json={"qid": "XX#1"}).status_code == 404


# ---------- backups ----------
def test_backup_and_restore(client):
    pid = profile(client)
    s = client.settings
    con = client.app.state.con
    client.post(f"/api/profiles/{pid}/attempts", json=attempt(1))
    first = db.backup(con, s.backup_dir, s.keep_backups)
    client.post(f"/api/profiles/{pid}/attempts", json=attempt(2))
    assert len(db.attempts(con, pid)) == 2
    db.restore(con, first, s.backup_dir, s.keep_backups)
    assert len(db.attempts(con, pid)) == 1


# ---------- tutor (no call to Claude) ----------
def test_tutor_needs_opt_in(client):
    pid = profile(client)
    aid = client.post(f"/api/profiles/{pid}/attempts", json=attempt()).json()["id"]
    c = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "question", "ref": f"a{aid}:3", "attempt": aid, "index": 3}).json()
    r = client.post(f"/api/conversations/{c['id']}/messages", json={"text": "hi"})
    assert r.status_code == 403  # AIT-09: nothing leaves until the learner opts in


def test_tutor_contexts(client):
    pid = profile(client)
    aid = client.post(f"/api/profiles/{pid}/attempts", json=attempt(wrong=(3, 5))).json()["id"]
    c = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "question", "ref": f"a{aid}:3", "attempt": aid, "index": 3}).json()
    assert c["messages"] == [] and c["suggestions"] and "you chose" in c["summary"]
    full = db.conversation(client.app.state.con, c["id"])["context"]
    assert "Correct answer:" in full["text"] and "Learner's answer:" in full["text"] and "Worked solution:" in full["text"]
    m = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "mistakes", "ref": f"a{aid}", "attempt": aid}).json()
    assert m["summary"].startswith("2 missed")
    p = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "plan", "ref": "all", "summary": "Tests taken: 1."}).json()
    assert p["title"] == "Study plan"
    listed = client.get(f"/api/profiles/{pid}/conversations?kind=question&ref=a{aid}:3").json()
    assert [x["id"] for x in listed] == [c["id"]]  # AIT-05: found again from the same question
    assert client.post(f"/api/profiles/{pid}/conversations", json={"kind": "question", "ref": "x", "attempt": 999, "index": 0}).status_code == 404


def test_figure_question_sends_image():
    qid = next(f"{t}#{q['k']}" for t, v in bank.questions().items() for q in v if "<svg" in q["q"])
    ctx = tutor.question_context(qid, 0)
    assert ctx["images"] and "[Figure 1: see the attached image]" in ctx["text"]


# ---------- engine simulation (headless, the browser's own code) ----------
def test_time_is_saved_and_given_to_the_tutor(client):
    pid = profile(client)
    a = attempt(wrong=(3,))
    for i, r in enumerate(a["items"]):
        r["ms"] = 30_000 + i * 1000
    a["ms"] = sum(r["ms"] for r in a["items"])
    aid = client.post(f"/api/profiles/{pid}/attempts", json=a).json()["id"]
    saved = client.get(f"/api/profiles/{pid}/attempts").json()[0]
    assert saved["ms"] == a["ms"] and saved["items"][3]["ms"] == 33_000
    c = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "question", "ref": f"a{aid}:3", "attempt": aid, "index": 3}).json()
    assert "Time the learner spent on it: 33 s" in db.conversation(client.app.state.con, c["id"])["context"]["text"]
    m = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "mistakes", "ref": f"a{aid}", "attempt": aid}).json()
    text = db.conversation(client.app.state.con, m["id"])["context"]["text"]
    assert "They took 13 min 10 s in all, 40 s per question" in text and "Time the learner spent on it: 33 s" in text
    # tests saved before timing existed still work, with no time lines
    old = client.post(f"/api/profiles/{pid}/attempts", json=attempt(t=1_700_000_100_000)).json()["id"]
    o = client.post(f"/api/profiles/{pid}/conversations", json={"kind": "mistakes", "ref": f"a{old}", "attempt": old}).json()
    assert "Time" not in db.conversation(client.app.state.con, o["id"])["context"]["text"]
    assert tutor.fmt_time(65_400) == "1 min 05 s" and tutor.fmt_time(9_600) == "10 s"


@pytest.mark.skipif(not shutil.which("node"), reason="node is not installed")
def test_engine_simulation():
    r = subprocess.run(["node", str(ROOT / "scripts" / "simulate.cjs"), "800"], capture_output=True, text=True, timeout=120)
    out = json.loads(r.stdout)
    assert r.returncode == 0, out
    assert out["blueprintViolations"] == 0 and out["tenTests"]["distinct"] == 200
