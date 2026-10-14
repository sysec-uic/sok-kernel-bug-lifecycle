#!/usr/bin/env python3
"""Extract the appendix classification tables (Tables 6-7 of the paper) and the
matching refs.bib entries into data/systems.json and data/systems.csv.

Usage: python3 tools/extract_systems.py [path/to/latex/root]
"""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "../sok-oakland27")
OUT = Path(__file__).resolve().parent.parent / "data"

STAGES = {"S2": "Triage", "S3": "Generation", "S4": "Validation", "S5": "Integration"}
TYPES = {"F": "Fuzzing", "S": "Static", "H": "Hybrid", "E": "Empirical"}
TECH = {
    "Cov": "coverage/execution", "Inp": "input-structure/spec inference",
    "Dep": "dependency/sequence inference", "Sch": "mutation/task scheduling",
    "Sta": "state-aware", "Dir": "directed", "Con": "concurrency interleaving",
    "Emu": "device emulation", "Tnt": "taint/dataflow", "Typ": "typestate/lifecycle",
    "Sym": "symbolic/path-sensitive", "Min": "spec/pattern mining", "ML": "learned models",
}


def parse_bib(text):
    entries = {}
    for m in re.finditer(r"@(\w+)\s*\{\s*([^,\s]+)\s*,(.*?)\n\}", text, re.S):
        fields = {}
        for f in re.finditer(r"(\w+)\s*=\s*(\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}|\"[^\"]*\"|\d+)", m.group(3)):
            v = f.group(2).strip()
            if v[0] in "{\"":
                v = v[1:-1]
            fields[f.group(1).lower()] = clean(v)
        entries[m.group(2)] = fields
    return entries


def clean(s):
    s = re.sub(r"\\(?:textit|emph|textbf|texttt|edited)\{([^{}]*)\}", r"\1", s)
    s = s.replace("~", " ").replace("\\&", "&").replace("--", "–").replace("\\_", "_")
    s = re.sub(r"\\['`^\"~]\{?(\w)\}?", r"\1", s)
    s = re.sub(r"[{}]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def venue_of(b):
    if b.get("eprint"):
        return "arXiv"
    return b.get("booktitle") or b.get("journal") or b.get("howpublished") or b.get("publisher") or ""


def rows(tex):
    body = tex.split("\\midrule", 1)[1].split("\\bottomrule", 1)[0]
    section = None
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("%") or line == "\\midrule":
            continue
        m = re.match(r"\\multicolumn\{\d+\}\{@\{\}l\}\{\\textit\{(.*)\}\}", line)
        if m:
            section = clean(re.sub(r"\\stage\{(S\d)\}", r"\1", m.group(1)))
            continue
        cells = [c.strip() for c in line.rstrip("\\").split("&")]
        yield section, cells


def name_and_key(cell):
    m = re.match(r"(.*?)~?\\cite\{([^}]+)\}", cell)
    return clean(m.group(1)), m.group(2).split(",")[0].strip()


def main():
    bib = parse_bib((ROOT / "refs.bib").read_text())
    systems = []

    def ref(key):
        b = bib.get(key, {})
        return {
            "title": b.get("title", ""),
            "authors": b.get("author", ""),
            "venue": venue_of(b),
            "year": b.get("year", ""),
            "url": b.get("url", "") or (f"https://doi.org/{b['doi']}" if b.get("doi") else "")
                   or (f"https://arxiv.org/abs/{b['eprint']}" if b.get("eprint") else ""),
            "bibkey": key,
        }

    for section, c in rows((ROOT / "tables/appendix_discovery.tex").read_text()):
        name, key = name_and_key(c[0])
        techs = [t.strip() for t in clean(c[4]).split(",") if t.strip()]
        systems.append({
            "system": name, "stage": "S1", "stageName": "Discovery",
            "group": section, "type": TYPES.get(c[1], c[1]), "target": clean(c[2]),
            "bugClass": clean(c[3]), "focus": "", "automation": "",
            "techniques": techs, "llm": "ding" in c[5], **ref(key),
        })

    for section, c in rows((ROOT / "tables/appendix_survey.tex").read_text()):
        name, key = name_and_key(c[0])
        stage = section.split()[0]
        focus = clean(c[1])
        systems.append({
            "system": name, "stage": stage, "stageName": STAGES[stage],
            "group": "", "type": "", "target": "", "bugClass": "",
            "focus": focus.replace(" (U)", ""), "userSpace": "(U)" in focus,
            "automation": clean(c[2]), "techniques": [], "llm": "ding" in c[3], **ref(key),
        })

    OUT.mkdir(exist_ok=True)
    (OUT / "systems.json").write_text(json.dumps({"techniques": TECH, "systems": systems}, indent=1, ensure_ascii=False))
    cols = ["system", "stage", "stageName", "group", "type", "target", "bugClass", "focus",
            "automation", "techniques", "llm", "title", "authors", "venue", "year", "url", "bibkey"]
    with open(OUT / "systems.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for s in systems:
            w.writerow({**s, "techniques": ";".join(s["techniques"])})
    missing = [s["system"] for s in systems if not s["title"]]
    print(f"{len(systems)} systems written; missing bib: {missing}")


if __name__ == "__main__":
    main()
