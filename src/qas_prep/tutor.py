"""The AI tutor (section 10 of the spec): Claude, through the Claude Agent SDK, on the Claude login of this Mac.

Each conversation starts with its context already in place: a question with its figure (as an image),
the four choices, the learner's choice, the answer and the worked solution; or every missed question of
a test; or the learner's progress summary (AIT-01 to AIT-03, AIT-06). Conversations are kept in the
database and continue across restarts by resuming Claude's own session (AIT-05).

The tutor has no tools at all: no shell, no files, no web. It only reads what the app sends it."""
import asyncio
import os
import time
from collections.abc import AsyncIterator
from pathlib import Path

import claude_agent_sdk
from claude_agent_sdk import (AssistantMessage, ClaudeAgentOptions, ClaudeSDKClient, ResultMessage, StreamEvent,
                              TextBlock)

from . import bank

CLI = Path(claude_agent_sdk.__file__).parent / "_bundled" / "claude"
API_KEY_VARS = ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN")
MAX_MESSAGE_BYTES = 32 * 1024 * 1024  # figures travel as base64 inside one message

SYSTEM = """You are a patient, encouraging math tutor helping a learner prepare for the ACCUPLACER
Quantitative Reasoning, Algebra, and Statistics (QAS) placement test. You work inside a practice app.
The app has already given you the material the learner is asking about: a practice question (with any
figure attached as an image), its choices, the learner's answer, the correct answer and the worked
solution; or a set of missed questions; or a summary of their practice results.

How to tutor:
- Start from what the learner asked. Be concrete and brief; one idea at a time. Ask a short check
  question when it helps, and wait for their answer instead of answering it yourself.
- When they got a question wrong, work out the most likely mistake behind their choice and explain why
  it was tempting.
- Offer a different method when asked, and say when a shortcut is safe to use on the test.
- Quizzes: ask one question at a time, then give feedback.
- Any practice question you write yourself must start with the label "Not verified" on its own line,
  because it has not been checked like the app's question bank. Give the answer only when asked or after
  the learner tries.
- Scores in the app are practice estimates, not official ACCUPLACER scores. Never claim otherwise.

Formatting: the app shows plain text with light Markdown (bold, italics, numbered and bulleted lists,
short headings). Do not use LaTeX or dollar signs. Write math with plain characters: ×, ÷, −, ², ³, √,
fractions as 3/4 or (x + 1)/2, exponents as x^5 or x⁵."""

SUGGESTIONS = {
    "question": ["Explain the solution another way", "Show me a different method", "Why was my answer tempting?",
                 "Quiz me on the key idea", "Write 3 similar practice questions"],
    "mistakes": ["What pattern do you see in my mistakes?", "Start with the one I should fix first",
                 "Quiz me on these topics", "Write practice questions for my weakest skill"],
    "plan": ["Make it a 2-week plan", "What should I practice today?", "Quiz me on my weakest topic",
             "Which mistakes cost me the most points?"],
}


class TutorUnavailable(Exception):
    pass


# ---------- building the context ----------
def _question_block(q: dict, chosen: int | None, number: int | None = None) -> str:
    L = bank.LETTERS
    head = f"Question {number}" if number else "Question"
    lines = [f"{head} — type: {q['name']} (topic: {q['topic']}; calculator {'allowed' if q['calc'] else 'not allowed'})",
             bank.plain(q["q"]), "", "Choices:"]
    lines += [f"  {L[i]}) {bank.plain(c)}" for i, c in enumerate(q["choices"])]
    lines.append(f"Correct answer: {L[q['ans']]}) {bank.plain(q['choices'][q['ans']])}")
    if chosen is not None and 0 <= chosen < 4:
        verdict = "correct" if chosen == q["ans"] else "wrong"
        lines.append(f"Learner's answer: {L[chosen]}) {bank.plain(q['choices'][chosen])} ({verdict})")
    lines += [f"Key idea: {q['tip']}", f"Worked solution: {bank.plain(q['exp'])}"]
    return "\n".join(lines)


def question_context(qid: str, chosen: int | None, test_label: str | None = None) -> dict:
    q = bank.get(qid)
    if not q:
        raise KeyError(qid)
    intro = f"The learner is reviewing a question from {test_label}." if test_label else \
        "The learner is reviewing a question from a topic practice drill."
    images = bank.figure_b64(q["q"])
    return {"text": intro + "\n\n" + _question_block(q, chosen), "images": images,
            "title": q["name"], "summary": _short(q, chosen)}


def _short(q: dict, chosen: int | None) -> str:
    L = bank.LETTERS
    s = f"{q['name']} · correct answer {L[q['ans']]}"
    if chosen is not None:
        s += f" · you chose {L[chosen]}"
    return s


def mistakes_context(attempt: dict, test_label: str) -> dict:
    missed, images = [], []
    for i, r in enumerate(attempt.get("items", [])):
        if r.get("u"):
            continue
        q = bank.get(f"{r['id']}#{r['k']}")
        if not q:
            continue
        figs = bank.figure_b64(q["q"])
        block = _question_block(q, r.get("ch"), i + 1)
        if figs:
            block = block.replace("[Figure 1: see the attached image]",
                                  f"[Figure: attached image {len(images) + 1}]")
        images += figs
        missed.append(block)
    correct = sum(1 for r in attempt.get("items", []) if r.get("u"))
    text = (f"The learner just finished {test_label}: estimated score {attempt['score']} on the 200–300 scale, "
            f"{correct} of {len(attempt.get('items', []))} correct. These are the {len(missed)} questions they missed, "
            "in test order. Help them review the mistakes.\n\n" + "\n\n---\n\n".join(missed))
    return {"text": text, "images": images, "title": f"Mistakes in {test_label}",
            "summary": f"{len(missed)} missed question{'s' if len(missed) != 1 else ''} from {test_label}"}


def plan_context(summary: str, topic: str | None) -> dict:
    focus = f" They want to focus on the topic {bank.CATS.get(topic, topic)}." if topic else ""
    text = ("The learner wants a study plan based on their practice results so far." + focus +
            "\n\nTheir results, as computed by the practice app:\n\n" + summary.strip())
    title = f"Study plan: {bank.CATS.get(topic, topic)}" if topic else "Study plan"
    return {"text": text, "images": [], "title": title, "summary": "Your scores, weak topics and most-missed question types"}


# ---------- talking to Claude ----------
def _env() -> dict[str, str]:
    """Use the Claude subscription login unless QAS_USE_API_KEY=1 asks for an API key instead."""
    if os.environ.get("QAS_USE_API_KEY") != "1":
        for name in API_KEY_VARS:
            os.environ.pop(name, None)
    return {}


def _options(cwd: Path, model: str, resume: str | None) -> ClaudeAgentOptions:
    cwd.mkdir(parents=True, exist_ok=True)
    return ClaudeAgentOptions(
        system_prompt=SYSTEM, model=model, tools=[], allowed_tools=[], mcp_servers={}, strict_mcp_config=True,
        setting_sources=[], permission_mode="dontAsk", max_turns=1, cwd=str(cwd), cli_path=str(CLI), env=_env(),
        include_partial_messages=True, resume=resume, max_buffer_size=MAX_MESSAGE_BYTES,
    )


def _user_message(text: str, images: list[str]) -> dict:
    content = [{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": b64}} for b64 in images]
    content.append({"type": "text", "text": text})
    return {"type": "user", "message": {"role": "user", "content": content}, "parent_tool_use_id": None}


def first_prompt(context: dict, ask: str) -> tuple[str, list[str]]:
    return f"{context['text']}\n\n=== The learner asks ===\n{ask}", context.get("images", [])


def replay_prompt(context: dict, history: list[dict], ask: str) -> tuple[str, list[str]]:
    """Used when Claude's own session cannot be resumed: the whole conversation is sent again."""
    turns = "\n\n".join(f"{'Learner' if m['role'] == 'user' else 'Tutor'}: {m['text']}" for m in history)
    return (f"{context['text']}\n\n=== Conversation so far ===\n{turns}\n\n=== The learner asks ===\n{ask}",
            context.get("images", []))


async def stream(text: str, images: list[str], cwd: Path, model: str, resume: str | None) -> AsyncIterator[dict]:
    """Yields {"delta": str} as the reply arrives, then {"done": True, "text": str, "session": str}."""
    async def messages():
        yield _user_message(text, images)

    client = ClaudeSDKClient(_options(cwd, model, resume))
    try:
        await asyncio.wait_for(client.connect(), timeout=60)
        await client.query(messages())
        parts, final, result = [], None, None
        async for msg in client.receive_response():
            if isinstance(msg, StreamEvent):
                ev = msg.event
                if ev.get("type") == "content_block_delta" and ev.get("delta", {}).get("type") == "text_delta":
                    parts.append(ev["delta"]["text"])
                    yield {"delta": ev["delta"]["text"]}
            elif isinstance(msg, AssistantMessage):
                final = "".join(b.text for b in msg.content if isinstance(b, TextBlock)) or final
            elif isinstance(msg, ResultMessage):
                result = msg
        if result is None or result.is_error:
            detail = getattr(result, "result", None) or getattr(result, "subtype", "no result")
            raise TutorUnavailable(f"Claude did not answer ({detail}).")
        reply = (result.result or final or "".join(parts)).strip()
        if not reply:
            raise TutorUnavailable("Claude returned an empty reply.")
        yield {"done": True, "text": reply, "session": result.session_id}
    except TutorUnavailable:
        raise
    except Exception as exc:  # the CLI is missing, not logged in, or offline
        raise TutorUnavailable(_explain(exc)) from exc
    finally:
        try:
            await client.disconnect()
        except Exception:  # noqa: BLE001
            pass


def _explain(exc: Exception) -> str:
    s = str(exc)
    low = s.lower()
    if "login" in low or "auth" in low or "401" in low:
        return "Claude is not logged in on this Mac. Run `uv run qas-prep claude-login` in the project folder."
    if "timed out" in low or isinstance(exc, asyncio.TimeoutError):
        return "Claude did not respond in time. Check the internet connection and try again."
    return f"The tutor is unavailable right now ({s[:200] or type(exc).__name__})."


# ---------- availability check (AIT-10) ----------
_status: dict = {"checked": 0.0, "ok": None, "message": ""}


async def status(cwd: Path, model: str, max_age: float = 300) -> dict:
    if time.time() - _status["checked"] < max_age and _status["ok"] is not None:
        return {"ok": _status["ok"], "message": _status["message"]}
    try:
        async for ev in stream("Reply with exactly: OK", [], cwd, "haiku", None):
            if ev.get("done"):
                break
        _status.update(ok=True, message="")
    except TutorUnavailable as exc:
        _status.update(ok=False, message=str(exc))
    _status["checked"] = time.time()
    return {"ok": _status["ok"], "message": _status["message"]}


def mark_status(ok: bool, message: str = "") -> None:
    _status.update(ok=ok, message=message, checked=time.time())
