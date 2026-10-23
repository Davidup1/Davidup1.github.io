#!/usr/bin/env python3
"""Fetch citation counts from a Google Scholar profile and write gs-output/gs_data.json.

Runs in the google-scholar workflow (see .github/workflows/google-scholar.yml);
the JSON is published to the `google-scholar-stats` branch, and the homepage
reads it to render "Cited by N" badges.
"""
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

SCHOLAR_ID = os.environ.get("GOOGLE_SCHOLAR_ID", "gAfFuhsAAAAJ")
URL = (
    "https://scholar.google.com/citations"
    f"?user={SCHOLAR_ID}&hl=en&cstart=0&pagesize=100&sortby=pubdate"
)
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


def norm(title: str) -> str:
    return re.sub(r"[^a-z0-9]", "", title.lower())


req = urllib.request.Request(URL, headers={"User-Agent": UA, "Accept-Language": "en"})
html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")

# each publication row: title in <a class="gsc_a_at">, citations in <a class="gsc_a_ac ...">
rows = re.findall(
    r'<a[^>]*class="gsc_a_at"[^>]*>(.*?)</a>.*?class="gsc_a_ac[^"]*"[^>]*>(\d*)</a>',
    html,
    re.S,
)
if not rows:
    sys.exit("No publication rows parsed — Scholar may have served a captcha page.")

strip_tags = re.compile(r"<[^>]+>")
papers = {}
for raw_title, cites in rows:
    title = strip_tags.sub("", raw_title).strip()
    papers[norm(title)] = {"title": title, "citations": int(cites or 0)}

# profile-level stats: gsc_rsb_std cells come in (all, recent) pairs —
# citations, h-index, i10-index
stds = re.findall(r'class="gsc_rsb_std">(\d+)</td>', html)

# citations-per-year histogram: year labels are gsc_g_t; each bar is a gsc_g_a whose
# z-index counts back from the latest year (1 = last label). Years with no
# citations have no bar, so they default to 0.
years = [int(y) for y in re.findall(r'<span class="gsc_g_t"[^>]*>(\d{4})</span>', html)]
cites_per_year = {str(y): 0 for y in years}
for z, n in re.findall(r'class="gsc_g_a"[^>]*z-index:(\d+)[^>]*><span class="gsc_g_al">(\d+)</span>', html):
    idx = len(years) - int(z)
    if 0 <= idx < len(years):
        cites_per_year[str(years[idx])] = int(n)

data = {
    "updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
    "scholar_id": SCHOLAR_ID,
    "total_citations": int(stds[0]) if stds else 0,
    "h_index": int(stds[2]) if len(stds) > 2 else 0,
    "i10_index": int(stds[4]) if len(stds) > 4 else 0,
    "cites_per_year": cites_per_year,
    "papers": papers,
}

os.makedirs("gs-output", exist_ok=True)
with open("gs-output/gs_data.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(papers)} papers; total citations {data['total_citations']}")
