"""Application tracker: JSONL source of truth + auto-exported CSV and XLSX.

usage:
  tracker.py add '<json>'            upsert one job (key = id, else derived from url, else company+title)
  tracker.py set <id> key=value ...  update fields on one job
  tracker.py list [status]           compact listing (newest last)
  tracker.py summary                 counts per status
  tracker.py export                  rewrite CSV/XLSX from the JSONL

Files live in config.log_dir (default ~/.job-apply): applications.jsonl / .csv / .xlsx
Every add/set re-exports CSV and XLSX automatically.
"""
import csv, datetime, hashlib, json, os, sys
from pathlib import Path

CFG = Path(os.environ.get("JOB_APPLY_HOME", Path.home() / ".job-apply"))
COLS = ["id", "date_applied", "status", "company", "title", "req_id", "location", "pay", "ats",
        "url", "resume_file", "resume_version", "fit", "callback_stars", "callback", "source_answer",
        "account", "express", "blocker", "notes", "updated"]


def log_dir():
    try:
        d = json.loads((CFG / "config.json").read_text(encoding="utf-8")).get("log_dir")
        if d:
            return Path(os.path.expandvars(os.path.expanduser(d)))
    except Exception:
        pass
    return CFG


def paths():
    d = log_dir(); d.mkdir(parents=True, exist_ok=True)
    return d / "applications.jsonl", d / "applications.csv", d / "applications.xlsx"


def load():
    j, _, _ = paths(); rows = {}
    if j.exists():
        for line in j.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line); rows[r["id"]] = r
    return rows


def save(rows):
    j, _, _ = paths()
    tmp = j.with_suffix(".tmp")
    tmp.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows.values()), encoding="utf-8")
    os.replace(tmp, j)
    export(rows)


def make_id(r):
    basis = r.get("url") or (r.get("company", "") + "|" + r.get("title", "") + "|" + r.get("req_id", ""))
    return hashlib.sha1(basis.lower().encode()).hexdigest()[:8]


def stars(n):
    try:
        n = max(0, min(5, int(n)))
    except Exception:
        return ""
    return "★" * n + "☆" * (5 - n)


def norm(r):
    now = datetime.datetime.now().isoformat(timespec="seconds")
    r.setdefault("id", make_id(r))
    if r.get("status") == "submitted" and not r.get("date_applied"):
        r["date_applied"] = datetime.date.today().isoformat()
    if r.get("resume_file") and not r.get("resume_version"):
        p = Path(r["resume_file"])
        if p.exists():
            st = p.stat()
            r["resume_version"] = f"{p.parent.name}/{p.name} @ {datetime.datetime.fromtimestamp(st.st_mtime):%Y-%m-%d %H:%M} sha1:{hashlib.sha1(p.read_bytes()).hexdigest()[:8]}"
    if "callback_stars" in r:
        r["callback"] = stars(r["callback_stars"])
    r["updated"] = now
    return r


def export(rows):
    _, c, x = paths()
    data = [{k: r.get(k, "") for k in COLS} for r in rows.values()]
    for d in data:
        for k, v in d.items():
            if isinstance(v, (list, dict)):
                d[k] = json.dumps(v, ensure_ascii=False)
    with open(c, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLS); w.writeheader(); w.writerows(data)
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill
        from openpyxl.utils import get_column_letter
    except ImportError:
        print("(openpyxl missing: pip install openpyxl for the .xlsx; CSV written)", file=sys.stderr)
        return
    wb = Workbook(); ws = wb.active; ws.title = "Applications"
    ws.append(COLS)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF"); cell.fill = PatternFill("solid", fgColor="1F3A5F")
    fills = {"submitted": "D9F2E3", "parked": "FFF2CC", "rejected": "F8D7DA", "skipped": "EEEEEE",
             "interview": "CFE2FF", "offer": "B7E4C7", "discovered": "FFFFFF"}
    for d in data:
        ws.append([d[k] for k in COLS])
        col = fills.get(str(d["status"]).lower())
        if col:
            for cell in ws[ws.max_row]:
                cell.fill = PatternFill("solid", fgColor=col)
        u = ws.cell(row=ws.max_row, column=COLS.index("url") + 1)
        if u.value:
            u.hyperlink = u.value; u.value = "link"; u.font = Font(color="0563C1", underline="single")
    widths = {"title": 46, "company": 22, "notes": 50, "blocker": 36, "resume_version": 40, "callback": 10}
    for i, k in enumerate(COLS, 1):
        ws.column_dimensions[get_column_letter(i)].width = widths.get(k, 14)
    ws.freeze_panes = "A2"; ws.auto_filter.ref = ws.dimensions
    try:
        wb.save(x)
    except PermissionError:
        print(f"(xlsx is open in Excel; close it to refresh {x.name}; CSV/JSONL updated)", file=sys.stderr)


def main(a):
    if not a:
        print(__doc__); return
    rows = load(); cmd = a[0]
    if cmd == "add":
        r = norm(json.loads(a[1])); old = rows.get(r["id"], {})
        old.update({k: v for k, v in r.items() if v not in (None, "")}); rows[r["id"]] = norm(old)
        save(rows); print("ok", r["id"], old.get("status", ""), old.get("company", ""), "|", old.get("title", ""))
    elif cmd == "set":
        r = rows[a[1]]
        for kv in a[2:]:
            k, v = kv.split("=", 1); r[k] = v
        rows[a[1]] = norm(r); save(rows); print("ok", a[1])
    elif cmd == "list":
        for r in rows.values():
            if len(a) < 2 or r.get("status") == a[1]:
                print(r["id"], "|", r.get("status", ""), "|", r.get("company", ""), "|", r.get("title", "")[:60], "|", r.get("callback", ""), "|", r.get("blocker", ""))
    elif cmd == "summary":
        from collections import Counter
        print(dict(Counter(r.get("status", "?") for r in rows.values())), "| log:", paths()[2])
    elif cmd == "export":
        export(rows); print("exported", *paths()[1:])
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
