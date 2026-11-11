"""The fixed, verified question bank (bank.json) and each question type's metadata (types.json).

A question's identity is "<type id>#<k>", for example "RN1#3" (BNK-06)."""
import base64
import html
import json
import re
from functools import lru_cache

import resvg_py

from .config import PACKAGE

CATS = {
    "RN": "Rational numbers", "RP": "Ratio and proportional relationships", "EX": "Exponents",
    "AE": "Algebraic expressions", "LE": "Linear equations", "LA": "Linear applications and graphs",
    "PS": "Probability and sets", "DS": "Descriptive statistics",
    "G1": "Geometry concepts for Pre-Algebra", "G2": "Geometry concepts for Algebra 1",
}
LETTERS = "ABCD"

# The page styles figures with CSS classes; these are the light-theme values, so a figure sent to the
# tutor as an image looks like it does on screen (AIT-06).
FIGURE_CSS = """
svg { font-family: 'Helvetica', 'Arial', sans-serif; }
.gl { stroke: #d5dce3; stroke-width: 1; }
.ax { stroke: #526070; stroke-width: 1.5; }
.tk { fill: #526070; font-size: 12px; font-family: 'Menlo', monospace; }
.it { font-style: italic; font-family: 'Georgia', serif; font-size: 14px; }
.pp { fill: #1c5d99; }
.pt { fill: #17212b; font-style: italic; font-size: 15px; font-family: 'Georgia', serif; }
.pl { stroke: #17212b; stroke-width: 2; fill: none; }
.box { fill: #dbe7f3; stroke: #17212b; stroke-width: 2; }
.bar1 { fill: #1c5d99; }
.bar2 { fill: #9a7a14; }
.po { fill: #ffffff; stroke: #1c5d99; stroke-width: 2.5; }
.ray { stroke: #1c5d99; stroke-width: 4; }
.arrowhead { fill: #1c5d99; }
"""


@lru_cache(maxsize=1)
def questions() -> dict[str, list[dict]]:
    return json.loads((PACKAGE / "bank.json").read_text())


@lru_cache(maxsize=1)
def types() -> dict[str, dict]:
    return {t["id"]: t for t in json.loads((PACKAGE / "types.json").read_text())}


def get(qid: str) -> dict | None:
    """The question with this identity, merged with its type's metadata, or None."""
    tid, _, k = qid.partition("#")
    t = types().get(tid)
    if not t or not k.lstrip("-").isdigit():
        return None
    q = next((x for x in questions().get(tid, []) if x["k"] == int(k)), None)
    return {**t, **q, "qid": qid, "topic": CATS[t["cat"]]} if q else None


def total() -> int:
    return sum(len(v) for v in questions().values())


# ---------- turning question HTML into what the tutor reads ----------
SVG_RE = re.compile(r"<svg\b.*?</svg>", re.S)


def figures(q_html: str) -> list[bytes]:
    """Each SVG figure in a question, rendered to PNG."""
    out = []
    for svg in SVG_RE.findall(q_html):
        if "xmlns=" not in svg[:200]:
            svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
        out.append(bytes(resvg_py.svg_to_bytes(svg_string=svg, style_sheet=FIGURE_CSS, background="white", zoom=2)))
    return out


def figure_b64(q_html: str) -> list[str]:
    return [base64.b64encode(png).decode() for png in figures(q_html)]


def _table_text(m: re.Match) -> str:
    rows = re.findall(r"<tr>(.*?)</tr>", m.group(0), re.S)
    lines = [" | ".join(_plain(c) for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", r, re.S)) for r in rows]
    return "\n[Table]\n" + "\n".join(lines) + "\n"


def _plain(fragment: str) -> str:
    s = re.sub(r'<span class="fr[^"]*"><span class="nu">(.*?)</span><span class="de">(.*?)</span></span>',
               lambda m: f"({_plain(m.group(1))})/({_plain(m.group(2))})", fragment)
    s = re.sub(r'√<span class="rad">(.*?)</span>', lambda m: f"√({_plain(m.group(1))})", s)
    s = re.sub(r"<sup[^>]*>(.*?)</sup>", lambda m: f"^({_plain(m.group(1))})" if len(m.group(1)) > 1 else f"^{m.group(1)}", s)
    s = re.sub(r"<sub[^>]*>(.*?)</sub>", r"_\1", s)
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s).strip()


def plain(q_html: str) -> str:
    """Question HTML as readable text: stacked fractions become (a)/(b), exponents ^n, tables pipe rows,
    and each figure a marker pointing at the attached image."""
    n = 0

    def fig(_):
        nonlocal n
        n += 1
        return f"\n[Figure {n}: see the attached image]\n"

    s = SVG_RE.sub(fig, q_html)
    s = re.sub(r"<table\b.*?</table>", _table_text, s, flags=re.S)
    s = _plain(s)
    return re.sub(r"\n{3,}", "\n\n", s)
