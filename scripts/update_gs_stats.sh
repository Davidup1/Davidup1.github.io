#!/usr/bin/env bash
# 本地抓取 Google Scholar 引用数据并强推到 google-scholar-stats 分支。
# GitHub Actions 的数据中心 IP 会被 Scholar 屏蔽,因此改由本机 cron 每日运行此脚本。
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
python3 scripts/fetch_gs_citations.py

TMP=$(mktemp -d)
cp gs-output/gs_data.json "$TMP/"
cd "$TMP"
git init -q
git checkout -q -b google-scholar-stats
git add gs_data.json
git -c user.email="lucky006@mindioai.com" -c user.name="lyj" \
    commit -q -m "Update Google Scholar stats $(date +%F)"
git push -q -f git@github.com:Davidup1/Davidup1.github.io.git google-scholar-stats
cd /
rm -rf "$TMP"
echo "gs stats pushed $(date '+%F %T')"
