"""
SasyaVahini ML - Download Remaining Commodities from Agmarknet API
Fetches Banana, Brinjal, Cabbage, Cauliflower, Soyabean and appends to the dataset.
"""

import csv
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
OUTPUT_CSV = DATA_DIR / "agmarknet_real_market_data.csv"

API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

REMAINING = [
    ("Banana", "Banana"),
    ("Brinjal", "Brinjal"),
    ("Cabbage", "Cabbage"),
    ("Cauliflower", "Cauliflower"),
    ("Soyabean", "Soybean"),  # maps to Soybean in model
]

def fetch_page(query_name, offset=0, retries=5):
    params = urllib.parse.urlencode({
        "api-key": API_KEY,
        "format": "json",
        "limit": 10,
        "offset": offset,
        "filters[commodity]": query_name,
    })
    url = f"{BASE_URL}?{params}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=25) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            time.sleep(2 * (attempt + 1))
            if attempt == retries - 1:
                print(f"[ERR {e}]", end=" ", flush=True)
                return {}
    return {}

def main():
    print("=== Downloading Remaining Crops ===", flush=True)
    all_new = []

    for query_name, canonical_name in REMAINING:
        print(f"\nFetching {canonical_name} ({query_name})...", end=" ", flush=True)
        offset = 0
        crop_records = []
        total = 0

        while True:
            data = fetch_page(query_name, offset)
            records = data.get("records", [])
            total = int(data.get("total", 0))

            if not records:
                break

            for r in records:
                r["canonical_crop"] = canonical_name
            crop_records.extend(records)

            if len(crop_records) % 50 == 0 or len(crop_records) >= total:
                print(f"{len(crop_records)}", end=" ", flush=True)
            else:
                print(".", end="", flush=True)

            if len(crop_records) >= total or len(crop_records) >= 600:
                break

            offset += len(records)
            time.sleep(0.35)

        print(f" -> Done: {len(crop_records)}/{total}", flush=True)
        all_new.extend(crop_records)

    print(f"\nTotal new records fetched: {len(all_new)}", flush=True)

    fieldnames = [
        "state", "district", "market", "commodity", "variety",
        "grade", "arrival_date", "min_price", "max_price", "modal_price"
    ]

    # Append to existing CSV
    with open(OUTPUT_CSV, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        for rec in all_new:
            writer.writerow(rec)

    print(f"Appended {len(all_new)} records to {OUTPUT_CSV.name}", flush=True)

if __name__ == "__main__":
    main()
