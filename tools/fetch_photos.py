"""Download freely licensed travel photos from Wikimedia Commons into assets/img
and write js/photos.js with captions + attribution.

Usage: python tools/fetch_photos.py
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_DIR = ROOT / "assets" / "img"
OUT_JS = ROOT / "js" / "photos.js"
UA = "PlainsToPeaksTripSite/1.0 (personal travel itinerary; python urllib)"
API = "https://commons.wikimedia.org/w/api.php"
WIDTH = 1400

# (key, caption, search query). Key prefix = place id (or "hero"/"food").
WANTED = [
    ("hero-1", "Nanda Devi rising above the Garhwal Himalaya", "Nanda Devi peak"),
    ("hero-2", "Snow slopes of Auli", "File:Auli-slopes.jpg"),
    ("mathura-1", "Vishram Ghat on the Yamuna", "Vishram Ghat Mathura"),
    ("mathura-2", "The Yamuna at Mathura", "File:Yamuna River, Mathura.jpg"),
    ("mathura-3", "Krishna Janmabhoomi, Mathura", "Krishna Janmabhoomi Mathura"),
    ("vrindavan-1", "Prem Mandir lit up at night", "Prem Mandir Vrindavan night"),
    ("vrindavan-2", "Banke Bihari Temple", "Banke Bihari temple Vrindavan"),
    ("vrindavan-3", "Keshi Ghat on the Yamuna", "Keshi Ghat Vrindavan"),
    ("delhi-1", "Humayun's Tomb", "Humayun's Tomb Delhi"),
    ("delhi-2", "Jama Masjid, Old Delhi", "Jama Masjid Delhi"),
    ("delhi-3", "Qutub Minar", "File:Qutub Minar in Delhi 03-2016.jpg"),
    ("dehradun-1", "Forest Research Institute", "Forest Research Institute Dehradun"),
    ("dehradun-2", "Mindrolling Monastery stupa", "Mindrolling Monastery Dehradun"),
    ("dehradun-3", "Robber's Cave (Guchhupani)", "Robber's Cave Dehradun"),
    ("haridwar-1", "Ganga Aarti at Har Ki Pauri", "Har Ki Pauri aarti"),
    ("haridwar-2", "The ghats of Haridwar", "Har ki Pauri Haridwar ghat"),
    ("haridwar-3", "Ganga at Haridwar", "Ganga river Haridwar"),
    ("rishikesh-1", "Ram Jhula over the Ganga", "Ram Jhula Rishikesh"),
    ("rishikesh-2", "Lakshman Jhula, Rishikesh", "Lakshman Jhula Rishikesh"),
    ("rishikesh-3", "Rafting on the Ganga", "rafting Rishikesh Ganges"),
    ("devprayag-1", "Bhagirathi meets Alaknanda at Devprayag", "Devprayag confluence"),
    ("devprayag-2", "Devprayag town", "Devprayag Uttarakhand"),
    ("devprayag-3", "Rudraprayag confluence", "Rudraprayag confluence Alaknanda Mandakini"),
    ("auli-1", "Auli's slopes in winter", "Auli skiing"),
    ("auli-2", "Himalayan view from Auli", "Gorson Bugyal"),
    ("auli-3", "Joshimath", "Joshimath town"),
    ("kausani-1", "Himalayan panorama from Kausani", "Kausani Himalaya"),
    ("kausani-2", "Baijnath temples", "Baijnath temple Uttarakhand"),
    ("kausani-3", "Kausani hills", "Kausani"),
    ("almora-1", "Almora on its ridge", "Almora town"),
    ("almora-2", "Jageshwar temple complex", "Jageshwar temples"),
    ("almora-3", "Kumaon hills near Almora", "Almora Uttarakhand hills"),
    ("kainchi-1", "Kainchi Dham", "Kainchi Dham"),
    ("kainchi-2", "Bhowali valley", "Bhowali"),
    ("kainchi-3", "Kumaon road", "Nainital district road hills"),
    ("nainital-1", "Naini Lake", "Naini Lake"),
    ("nainital-2", "Boats on Naini Lake", "Nainital boats lake"),
    ("nainital-3", "Nainital Mall Road", "Nainital Mall Road"),
    ("food-1", "Jalebi", "Jalebi"),
    ("food-2", "Chole bhature", "Chole bhature"),
    ("food-3", "Aloo paratha", "Aloo paratha"),
    ("food-4", "Momos", "Momos dumplings"),
    ("food-5", "Peda", "Mathura peda"),
    ("food-6", "Bal mithai", "File:WP 20150531 13 15 43 Pro.jpg"),
    ("food-7", "Masala chai", "Masala chai"),
    ("food-8", "Lassi", "Lassi"),
]


def fetch(url: str, timeout: int = 60) -> bytes:
    """GET with polite retries on rate limiting (HTTP 429/503)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as err:
            if err.code not in (429, 503) or attempt == 5:
                raise
            wait = int(err.headers.get("Retry-After") or 0) or 5 * (attempt + 1)
            print(f"rate limited, waiting {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def get_json(params: dict) -> dict:
    return json.loads(fetch(API + "?" + urllib.parse.urlencode(params), timeout=30))


def strip_html(text):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", text or "")).strip()


def candidates(query: str):
    """Search Commons, or fetch one exact file when the query is a 'File:...' title."""
    base = {"action": "query", "format": "json", "prop": "imageinfo",
            "iiprop": "url|size|mime|extmetadata", "iiurlwidth": WIDTH}
    if query.startswith("File:"):
        data = get_json({**base, "titles": query})
    else:
        data = get_json({**base, "generator": "search", "gsrsearch": query,
                         "gsrnamespace": 6, "gsrlimit": 12})
    pages = sorted(data.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99))
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        if info.get("mime") != "image/jpeg":
            continue
        w, h = info.get("width", 0), info.get("height", 1)
        if w < 900 or (w / h < 1.15 and not query.startswith("File:")):
            continue
        meta = info.get("extmetadata", {})
        yield {
            "title": page["title"],
            "thumb": info.get("thumburl"),
            "page": info.get("descriptionurl"),
            "artist": strip_html(meta.get("Artist", {}).get("value")) or "Unknown",
            "license": strip_html(meta.get("LicenseShortName", {}).get("value")) or "See source",
            "ratio": round(w / h, 3),
        }


def download(url: str, dest: Path) -> None:
    dest.write_bytes(fetch(url))


def main():
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    used, photos, missing = set(), [], []
    for key, caption, query in WANTED:
        pick = next((c for c in candidates(query) if c["title"] not in used), None)
        if not pick:
            missing.append(key)
            continue
        used.add(pick["title"])
        dest = IMG_DIR / f"{key}.jpg"
        if not dest.exists():
            download(pick["thumb"], dest)
        time.sleep(1.5)
        photos.append({
            "key": key, "src": f"assets/img/{key}.jpg", "caption": caption, "ratio": pick["ratio"],
            "credit": pick["artist"][:80], "license": pick["license"], "source": pick["page"],
            "file": pick["title"],
        })
        print(f"ok   {key:14} {pick['title']}")
    OUT_JS.write_text(
        "/* Generated by tools/fetch_photos.py — Wikimedia Commons photos with attribution. */\n"
        "export const PHOTOS = " + json.dumps(photos, indent=2, ensure_ascii=False) + ";\n\n"
        "export const photosFor = (prefix) => PHOTOS.filter((p) => p.key.startsWith(prefix + \"-\"));\n",
        encoding="utf-8",
    )
    if missing:
        print("missing:", ", ".join(missing), file=sys.stderr)


if __name__ == "__main__":
    main()
