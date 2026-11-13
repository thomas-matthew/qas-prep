"""The web app: static pages plus a small JSON API, served on the home network."""
import asyncio
import ipaddress
import json
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import bank, db, tutor
from .config import PACKAGE, Settings, load

WEB = PACKAGE / "web"
PRIVATE = [ipaddress.ip_network(n) for n in
           ("127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16", "100.64.0.0/10",
            "::1/128", "fc00::/7", "fe80::/10")]


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load()
    con = db.connect(settings.db_path)

    async def backups():
        """PLT-04: a backup when the app starts if the last one is over 20 hours old, then daily."""
        while True:
            last = db.latest_backup(settings.backup_dir)
            if not last or time.time() - last.stat().st_mtime > 20 * 3600:
                try:
                    db.backup(con, settings.backup_dir, settings.keep_backups)
                except Exception as exc:  # noqa: BLE001
                    print(f"backup failed: {exc}")
            await asyncio.sleep(3600)

    @asynccontextmanager
    async def lifespan(_app):
        task = asyncio.create_task(backups())
        yield
        task.cancel()

    app = FastAPI(title="QAS Prep", lifespan=lifespan, docs_url=None, redoc_url=None)
    app.state.con, app.state.settings = con, settings

    @app.middleware("http")
    async def home_network_only(request: Request, call_next):
        """DAT-14 / PLT-08: refuse anything that does not come from this Mac or a private network."""
        host = request.client.host if request.client else ""
        try:
            ok = host == "testclient" or any(ipaddress.ip_address(host) in n for n in PRIVATE)
        except ValueError:
            ok = False
        if not ok:
            return JSONResponse({"error": "This app is only available on the home network."}, status_code=403)
        return await call_next(request)

    # ---------- pages ----------
    @app.get("/")
    def index():
        return FileResponse(WEB / "index.html", headers={"Cache-Control": "no-cache"})

    @app.get("/manifest.webmanifest")
    def manifest():
        return FileResponse(WEB / "manifest.webmanifest", media_type="application/manifest+json")

    app.mount("/web", StaticFiles(directory=WEB), name="web")

    @app.get("/api/bank.js")
    def bank_js():
        """The bank as a script, plus the questions currently flagged, which tests leave out (PLT-07)."""
        flagged = sorted({f["qid"] for f in db.flags(con, open_only=True)})
        body = ("window.QAS_BANKDATA=" + json.dumps(bank.questions(), ensure_ascii=False, separators=(",", ":")) +
                ";\nwindow.QAS_FLAGGED=" + json.dumps(flagged) + ";\n")
        return Response(body, media_type="text/javascript", headers={"Cache-Control": "no-cache"})

    # ---------- profiles ----------
    class Name(BaseModel):
        name: str = Field(min_length=1, max_length=40)

    def need_profile(pid: int) -> dict:
        p = db.profile(con, pid)
        if not p:
            raise HTTPException(404, "That profile no longer exists.")
        return p

    @app.get("/api/profiles")
    def list_profiles():
        return db.profiles(con)

    @app.post("/api/profiles")
    def create_profile(body: Name):
        name = body.name.strip()
        if any(p["name"].lower() == name.lower() for p in db.profiles(con)):
            raise HTTPException(409, f"There is already a profile called {name}.")
        return db.profile(con, db.add_profile(con, name))

    @app.patch("/api/profiles/{pid}")
    def rename_profile(pid: int, body: Name):
        need_profile(pid)
        db.rename_profile(con, pid, body.name.strip())
        return db.profile(con, pid)

    @app.delete("/api/profiles/{pid}")
    def delete_profile(pid: int):
        need_profile(pid)
        db.delete_profile(con, pid)
        return {"ok": True}

    # ---------- attempts ----------
    @app.get("/api/profiles/{pid}/attempts")
    def list_attempts(pid: int):
        need_profile(pid)
        return db.attempts(con, pid)

    @app.post("/api/profiles/{pid}/attempts")
    async def save_attempt(pid: int, request: Request):
        need_profile(pid)
        data = await request.json()
        if not isinstance(data, dict) or not isinstance(data.get("t"), (int, float)) or "score" not in data \
                or not isinstance(data.get("items"), list) or len(data["items"]) != 20:
            raise HTTPException(400, "A saved test needs a time, a score and its 20 questions.")
        return {"id": db.add_attempt(con, pid, data)}

    @app.delete("/api/profiles/{pid}/attempts")
    def clear_attempts(pid: int):
        need_profile(pid)
        return {"deleted": db.clear_attempts(con, pid)}

    @app.get("/api/profiles/{pid}/export")
    def export(pid: int):
        p = need_profile(pid)
        stamp = time.strftime("%Y-%m-%d")
        return JSONResponse(db.export_profile(con, pid), headers={
            "Content-Disposition": f'attachment; filename="qas-history-{p["name"]}-{stamp}.json"'})

    @app.post("/api/profiles/{pid}/import")
    async def import_(pid: int, request: Request):
        need_profile(pid)
        try:
            added = db.import_profile(con, pid, await request.json())
        except (ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(400, str(exc) or "That file could not be read.")
        return {"added": added}

    # ---------- flags ----------
    class Flag(BaseModel):
        qid: str
        note: str = Field(default="", max_length=2000)
        profile: int | None = None

    @app.get("/api/flags")
    def list_flags():
        out = []
        for f in db.flags(con):
            q = bank.get(f["qid"])
            out.append({**f, "name": q["name"] if q else f["qid"], "topic": q["topic"] if q else ""})
        return out

    @app.post("/api/flags")
    def flag(body: Flag):
        if not bank.get(body.qid):
            raise HTTPException(404, "Unknown question.")
        return {"id": db.add_flag(con, body.qid, body.profile, body.note.strip())}

    @app.post("/api/flags/{qid}/recheck")
    def recheck(qid: str):
        return {"cleared": db.recheck_flag(con, qid)}

    # ---------- tutor ----------
    class Optin(BaseModel):
        on: bool

    class NewConversation(BaseModel):
        kind: str  # question | mistakes | plan
        ref: str  # what the conversation is about, so it can be reopened (AIT-05)
        attempt: int | None = None
        index: int | None = None  # the question's position in that test
        qid: str | None = None  # a drill question
        chosen: int | None = None
        summary: str | None = Field(default=None, max_length=30000)
        topic: str | None = None

    class Ask(BaseModel):
        text: str = Field(min_length=1, max_length=4000)

    @app.get("/api/tutor/status")
    async def tutor_status(fresh: bool = False):
        return await tutor.status(settings.tutor_dir, settings.tutor_model, 0 if fresh else 300)

    @app.post("/api/profiles/{pid}/tutor-optin")
    def optin(pid: int, body: Optin):
        need_profile(pid)
        db.set_opt_in(con, pid, body.on)
        return db.profile(con, pid)

    @app.get("/api/profiles/{pid}/conversations")
    def list_conversations(pid: int, kind: str | None = None, ref: str | None = None):
        need_profile(pid)
        return db.conversations(con, pid, kind, ref)

    def test_label(pid: int, aid: int) -> tuple[dict, str]:
        a = db.attempt(con, pid, aid)
        if not a:
            raise HTTPException(404, "That test is not in your history.")
        n = [x["id"] for x in db.attempts(con, pid)].index(aid) + 1
        return a, f"practice test #{n} ({time.strftime('%b %-d', time.localtime(a['t'] / 1000))})"

    @app.post("/api/profiles/{pid}/conversations")
    def new_conversation(pid: int, body: NewConversation):
        """Tutor material comes only from saved tests and the bank, so a test in progress can never be
        sent (AIT-08): it is not saved until the last answer."""
        need_profile(pid)
        if body.kind == "question":
            if body.attempt is not None:
                a, label = test_label(pid, body.attempt)
                if body.index is None or not 0 <= body.index < len(a["items"]):
                    raise HTTPException(400, "No such question in that test.")
                r = a["items"][body.index]
                ctx = tutor.question_context(f"{r['id']}#{r['k']}", r.get("ch"), f"{label}, question {body.index + 1}",
                                             r.get("ms"))
            elif body.qid:
                if not bank.get(body.qid):
                    raise HTTPException(404, "Unknown question.")
                ctx = tutor.question_context(body.qid, body.chosen)
            else:
                raise HTTPException(400, "Say which question.")
        elif body.kind == "mistakes":
            if body.attempt is None:
                raise HTTPException(400, "Say which test.")
            a, label = test_label(pid, body.attempt)
            ctx = tutor.mistakes_context(a, label)
        elif body.kind == "plan":
            if not body.summary:
                raise HTTPException(400, "A study plan needs your results summary.")
            ctx = tutor.plan_context(body.summary, body.topic)
        else:
            raise HTTPException(400, "Unknown conversation kind.")
        cid = db.add_conversation(con, pid, body.kind, body.ref, ctx["title"], ctx)
        return conversation_view(cid)

    def conversation_view(cid: int) -> dict:
        c = db.conversation(con, cid)
        if not c:
            raise HTTPException(404, "That conversation no longer exists.")
        ctx = c.pop("context")
        c.pop("sdk_session", None)
        c["summary"] = ctx.get("summary", "")
        c["figures"] = len(ctx.get("images", []))
        c["suggestions"] = tutor.SUGGESTIONS.get(c["kind"], [])
        return c

    @app.get("/api/conversations/{cid}")
    def get_conversation(cid: int):
        return conversation_view(cid)

    @app.delete("/api/conversations/{cid}")
    def delete_conversation(cid: int):
        con.execute("DELETE FROM conversations WHERE id = ?", (cid,))
        return {"ok": True}

    @app.post("/api/conversations/{cid}/messages")
    async def ask(cid: int, body: Ask):
        """Streams the reply as server-sent events: {"delta": text} pieces, then {"done": true} or {"error": msg}."""
        c = db.conversation(con, cid)
        if not c:
            raise HTTPException(404, "That conversation no longer exists.")
        p = db.profile(con, c["profile_id"])
        if not p or not p["tutorOptIn"]:
            raise HTTPException(403, "Turn on the tutor first. Nothing is sent to Claude until you do.")
        history, ctx, session = c["messages"], c["context"], c["sdk_session"]
        question = body.text.strip()

        async def events():
            attempts = [("resume", session)] if session else []
            attempts.append(("fresh", None))
            last_error = "The tutor is unavailable right now."
            for how, resume in attempts:
                if how == "resume":
                    text, images = question, []
                elif history:
                    text, images = tutor.replay_prompt(ctx, history, question)
                else:
                    text, images = tutor.first_prompt(ctx, question)
                sent = False
                try:
                    async for ev in tutor.stream(text, images, settings.tutor_dir, settings.tutor_model, resume):
                        if "delta" in ev:
                            sent = True
                            yield f"data: {json.dumps({'delta': ev['delta']})}\n\n"
                        else:
                            db.add_message(con, cid, "user", question)
                            db.add_message(con, cid, "assistant", ev["text"])
                            db.set_sdk_session(con, cid, ev["session"])
                            tutor.mark_status(True)
                            yield f"data: {json.dumps({'done': True, 'text': ev['text']})}\n\n"
                            return
                except tutor.TutorUnavailable as exc:
                    last_error = str(exc)
                    if sent:  # part of a reply already shown: do not start over silently
                        break
            tutor.mark_status(False, last_error)
            yield f"data: {json.dumps({'error': last_error})}\n\n"

        return StreamingResponse(events(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    return app
