"""Strip tracking params and unwrap redirect wrappers from job links. usage: cleanurl.py <url> [...]"""
import re, sys, urllib.parse as up

DROP = re.compile(r"^(source|src|utm_.*|rx_.*|trk.*|refid|trackingid|bid|gh_src|lever-source.*|ref|referrer|"
                  r"iis|iisn|mode|codes|jobpipeline|sourcetype|ccuid|eid|currentjobid|position|pagenum|"
                  r"original_referer|li_fat_id|gclid|fbclid|mc_.*)$", re.I)
WRAP = ("url", "u", "target", "redirect", "dest")


def clean(u):
    for _ in range(3):
        p = up.urlparse(u)
        q = up.parse_qs(p.query)
        if re.search(r"linkedin\.com/(safety/go|redir|jobs/view/externalApply)", u) or p.path.endswith("/redirect"):
            for k in WRAP:
                if k in q:
                    u = q[k][0]; break
            else:
                break
        else:
            break
    p = up.urlparse(u)
    keep = [(k, v) for k, v in up.parse_qsl(p.query, keep_blank_values=True) if not DROP.match(k)]
    return up.urlunparse(p._replace(query=up.urlencode(keep), fragment=""))


if __name__ == "__main__":
    for a in sys.argv[1:]:
        print(clean(a))
