"""
SasyaVahini ML - Real Agmarknet Data Downloader v2

Downloads actual daily commodity prices from data.gov.in OGD API.
Handles the sample API key's per-request limit cap by paginating in small batches.
"""

import os
import sys
import time
import json
import csv
import urllib.request
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

# data.gov.in public sample API key (caps at ~10 records per request)
API_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"

TARGET_COMMODITIES = [
    "Tomato", "Onion", "Potato", "Wheat", "Rice",
    "Grapes", "Pomegranate", "Soybean", "Maize", "Sugarcane",
    "Cotton", "Chilli", "Brinjal", "Cauliflower", "Cabbage", "Banana",
]

# The sample key caps each response at 10 records
ACTUAL_PAGE_SIZE = 10
# Max records per commodity (to avoid infinite loops)
MAX_PER_COMMODITY = 800
OUTPUT_CSV = DATA_DIR / "agmarknet_real_market_data.csv"


def fetch_page(commodity, offset=0, retries=3):
    """Fetch a single page of records for a commodity with retries."""
    params = urllib.parse.urlencode({
        "api-key": API_KEY,
        "format": "json",
        "limit": 1000,  # Ask for max, API will cap it
        "offset": offset,
        "filters[commodity]": commodity,
    })
    url = f"{BASE_URL}?{params}"

    for attempt in range(retries):
        try:
            req = urllib.request.Request(url)
            req.add_header("User-Agent", "SasyaVahini-ML/0.2")
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw)
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
            else:
                raise e


def download_all():
    """Download data for all target commodities with proper pagination."""
    print("=" * 60, flush=True)
    print("  SasyaVahini - Real Agmarknet Data Downloader v2", flush=True)
    print("  Source: data.gov.in (Ministry of Agriculture)", flush=True)
    print("  Paginating in small batches (API key limit)", flush=True)
    print("=" * 60, flush=True)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    all_records = []
    stats = {}

    for i, commodity in enumerate(TARGET_COMMODITIES, 1):
        print(f"\n[{i}/{len(TARGET_COMMODITIES)}] {commodity}: ", end="", flush=True)
        offset = 0
        commodity_records = []
        total_available = 0

        while offset < MAX_PER_COMMODITY:
            try:
                data = fetch_page(commodity, offset)
                records = data.get("records", [])
                total_available = int(data.get("total", 0))

                if not records:
                    break

                commodity_records.extend(records)

                # Show progress dots
                if len(commodity_records) % 50 == 0 or len(commodity_records) >= total_available:
                    print(f"{len(commodity_records)}", end=" ", flush=True)
                else:
                    print(".", end="", flush=True)

                # Stop if we have all records
                if len(commodity_records) >= total_available:
                    break

                offset += len(records)  # Use actual returned count, not requested
                time.sleep(0.3)  # Be respectful

            except Exception as e:
                print(f"[ERR at {offset}: {e}]", end=" ", flush=True)
                time.sleep(2)
                offset += ACTUAL_PAGE_SIZE  # Skip this page and try next
                continue

        print(f" => {len(commodity_records)}/{total_available} records", flush=True)
        stats[commodity] = {"fetched": len(commodity_records), "total": total_available}
        all_records.extend(commodity_records)

    if not all_records:
        print("\n[ERROR] No data downloaded!", flush=True)
        return

    # Write CSV
    fieldnames = ["state", "district", "market", "commodity", "variety",
                  "grade", "arrival_date", "min_price", "max_price", "modal_price"]

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for rec in all_records:
            writer.writerow(rec)

    print(f"\n{'=' * 60}", flush=True)
    print(f"  DONE! Total: {len(all_records):,} records", flush=True)
    print(f"  Saved: {OUTPUT_CSV}", flush=True)

    commodities = set(r.get("commodity", "") for r in all_records)
    states = set(r.get("state", "") for r in all_records)
    districts = set(r.get("district", "") for r in all_records)
    print(f"  Commodities: {len(commodities)} | States: {len(states)} | Districts: {len(districts)}", flush=True)

    print(f"\n  Per-commodity breakdown:", flush=True)
    for c, s in sorted(stats.items(), key=lambda x: -x[1]["fetched"]):
        print(f"    {c:20s}  {s['fetched']:>5,} / {s['total']:>5,}", flush=True)

    print(f"{'=' * 60}", flush=True)


if __name__ == "__main__":
    download_all()
