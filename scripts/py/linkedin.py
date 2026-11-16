"""LinkedIn public (guest) job endpoints. No login, no cookies.

usage:
  linkedin.py search [--q "query" ...] [--days 30] [--loc "United States"] [--intern] [--out file.json]
      queries default to config.search.queries; prints id | title | company | location | date
  linkedin.py jd <id> [...]          title + description excerpt + keyword hits from config.search.keywords
  linkedin.py applyurl <id> [...]    employer apply URL (cleaned), or EASY for Easy Apply only
Be gentle: built-in 3 s delay between requests.
"""
import argparse, html, json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from cleanurl import clean  # noqa: E402

CFG = Path(os.environ.get("JOB_APPLY_HOME", Path.home() / ".job-apply"))
UA = {"User-Agent": "Mozilla/5.0"}
T = lambda s: html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or ""))).strip()


def cfg():
    try:
        return json.loads((CFG / "config.json").read_text(encoding="utf-8"))
    except Exception:
        return {}


def get(url):
    for i in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20).read().decode("utf-8", "ignore")
        except Exception:
            time.sleep(8)
    return ""


def search(a):
    qs = a.q or cfg().get("search", {}).get("queries", [])
    out = {}
    for q in qs:
        for start in range(0, 40, 10):
            url = ("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=" + urllib.parse.quote(q)
                   + "&location=" + urllib.parse.quote(a.loc) + f"&f_TPR=r{a.days * 86400}" + ("&f_E=1" if a.intern else "") + f"&start={start}")
            h = get(url); n = 0
            for li in re.findall(r"<li>[\s\S]*?</li>", h):
                m = re.search(r"jobPosting:(\d+)", li)
                if not m:
                    continue
                n += 1; i = m.group(1)
                g = lambda p: (re.search(p, li) or [None, None])[1]
                j = out.setdefault(i, dict(id=i, title=T(g(r"base-search-card__title[^>]*>([\s\S]*?)</h3>")),
                                          company=T(g(r"base-search-card__subtitle[^>]*>([\s\S]*?)</h4>")),
                                          location=T(g(r"job-search-card__location[^>]*>([\s\S]*?)</span>")),
                                          date=g(r'datetime="([^"]+)"'), queries=[]))
                j["queries"].append(q)
            if n < 10:
                break
            time.sleep(3)
    rows = sorted(out.values(), key=lambda j: -len(j["queries"]))
    if a.out:
        Path(a.out).write_text(json.dumps(rows, indent=1), encoding="utf-8")
    for j in rows:
        print(j["id"], "|", j["title"][:80], "|", j["company"][:30], "|", j["location"][:25], "|", j["date"], "|", len(j["queries"]))
    print(len(rows), "jobs", file=sys.stderr)


def jd(ids):
    kws = cfg().get("search", {}).get("keywords", [])
    for i in ids:
        h = get(f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{i}")
        t = T(h)
        title = html.unescape((re.search(r"topcard__title[^>]*>([^<]+)", h) or [0, ""])[1].strip())
        hits = [k for k in kws if re.search(k, t, re.I)]
        flags = [f for f in ("US person", "U.S. person", "citizen", "clearance", "export", "green card", "permanent resident") if f.lower() in t.lower()]
        print(f"## {i} | {title}\nkeywords: {', '.join(hits)}\nflags: {', '.join(flags) or '-'}\n{t[:2500]}\n")
        sys.stdout.flush(); time.sleep(3)


def applyurl(ids):
    for i in ids:
        h = get(f"https://www.linkedin.com/jobs/view/{i}/")
        m = re.search(r'<code id="applyUrl"[^>]*><!--"?([^"<]+)"?--></code>', h)
        u = html.unescape(m.group(1)) if m else ""
        title = html.unescape((re.search(r"<title>([^<]+)", h) or [0, ""])[1])[:80]
        print(i, "|", title, "|", clean(u) if u else ("EASY" if "Easy Apply" in h else "none"))
        sys.stdout.flush(); time.sleep(3)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__); sys.exit()
    cmd, rest = sys.argv[1], sys.argv[2:]
    if cmd == "search":
        p = argparse.ArgumentParser(); p.add_argument("--q", action="append"); p.add_argument("--days", type=int, default=30)
        p.add_argument("--loc", default="United States"); p.add_argument("--intern", action="store_true"); p.add_argument("--out")
        search(p.parse_args(rest))
    elif cmd == "jd":
        jd(rest)
    elif cmd == "applyurl":
        applyurl(rest)
    else:
        print(__doc__)
