"""List open jobs on a company's public ATS board.

usage: boards.py greenhouse <board> [--q regex]   (boards-api.greenhouse.io)
       boards.py lever <company> [--q regex]      (api.lever.co)
       boards.py ashby <org> [--q regex]          (api.ashbyhq.com)
prints: title | location | url
"""
import argparse, json, re, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}


def j(url):
    return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read())


def rows(ats, name):
    if ats == "greenhouse":
        for x in j(f"https://boards-api.greenhouse.io/v1/boards/{name}/jobs")["jobs"]:
            yield x["title"], x.get("location", {}).get("name", ""), x["absolute_url"]
    elif ats == "lever":
        for x in j(f"https://api.lever.co/v0/postings/{name}?mode=json"):
            yield x["text"], x.get("categories", {}).get("location", ""), x["hostedUrl"]
    elif ats == "ashby":
        for x in j(f"https://api.ashbyhq.com/posting-api/job-board/{name}")["jobs"]:
            yield x["title"], x.get("location", ""), x["jobUrl"]


if __name__ == "__main__":
    p = argparse.ArgumentParser(); p.add_argument("ats", choices=["greenhouse", "lever", "ashby"]); p.add_argument("name"); p.add_argument("--q")
    a = p.parse_args()
    for t, loc, u in rows(a.ats, a.name):
        if not a.q or re.search(a.q, t, re.I):
            print(t, "|", loc, "|", u)
