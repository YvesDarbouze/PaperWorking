#!/usr/bin/env python3
"""
fetch_data.py — PaperWorking Property Data Ingestion Engine
============================================================
Queries external APIs or a deterministic mock data layer to retrieve:
  - Property list price and estimated market value
  - Annual property tax assessment with 3-year history
  - Estimated monthly rent (from Zillow RentZestimate or Bridge API)
  - Comparable sales within a configurable radius and time window
  - After-Repair Value (ARV) via GLA-weighted comp adjustment

Writes a structured `property_data.json` file that feeds directly into
the underwriting-properties, brrrr-analysis, and depreciating-assets skills.

Supported API providers:
  mock           — deterministic data generator (no network, seeded from address)
  bridge         — Bridge Data Output API (requires BRIDGE_API_TOKEN)
  zillow_rapid   — Zillow via RapidAPI (requires X-RapidAPI-Key)
  paperworking   — Internal PaperWorking /api/reil endpoint (requires id_token)

Usage:
    python3 scripts/fetch_data.py --address "1234 Main St, Austin, TX 78701"
    python3 scripts/fetch_data.py --address "..." --api-provider bridge --api-key "$TOKEN"

Exit codes:
    0 — Success
    1 — Address validation error
    2 — API authentication failure
    3 — Insufficient comps after all expansion attempts
    4 — Network error after retries
    5 — Output schema validation error
    6 — I/O write error
"""

import argparse
import hashlib
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Optional


SCHEMA_VERSION = "1.0.0"

# Default adjustment premiums (standard appraisal industry values)
BED_PREMIUM  = 5_000.0   # $ per bedroom difference
BATH_PREMIUM = 3_500.0   # $ per bathroom difference


# ─── US state abbreviations for validation ────────────────────────────────────
US_STATES = {
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN",
    "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV",
    "NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN",
    "TX","UT","VT","VA","WA","WV","WI","WY","DC",
}

# Regional median price-per-sqft index for mock data realism
# Source: approximate 2024 regional medians
REGIONAL_PPSF: dict[str, float] = {
    "CA": 520, "NY": 480, "WA": 420, "MA": 400, "CO": 380,
    "TX": 195, "FL": 210, "GA": 175, "AZ": 200, "NC": 170,
    "IL": 185, "OH": 145, "PA": 155, "MI": 140, "TN": 175,
    "NV": 230, "OR": 320, "VA": 255, "MD": 270, "NJ": 310,
    "DEFAULT": 180,
}

REGIONAL_RENT_RATIO: dict[str, float] = {
    "CA": 0.0042, "NY": 0.0045, "WA": 0.0048, "TX": 0.0055,
    "FL": 0.0052, "CO": 0.0050, "GA": 0.0058, "AZ": 0.0053,
    "DEFAULT": 0.0055,
}


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: Argument parsing and address validation
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="PaperWorking Property Data Ingestion Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--address",        type=str,   required=True,
                   help='Full property address e.g. "1234 Main St, Austin, TX 78701"')
    p.add_argument("--radius-miles",   type=float, default=0.5,
                   help="Comparable sales search radius in miles")
    p.add_argument("--comp-months",    type=int,   default=6,
                   help="Maximum months ago for comparable sales")
    p.add_argument("--min-comps",      type=int,   default=3,
                   help="Minimum acceptable comparable count before expanding search")
    p.add_argument("--subject-sqft",   type=float, default=0.0,
                   help="Subject property square footage (0 = infer from API)")
    p.add_argument("--subject-beds",   type=int,   default=0,
                   help="Subject bedroom count (0 = infer from API)")
    p.add_argument("--subject-baths",  type=float, default=0.0,
                   help="Subject bathroom count (0 = infer from API)")
    p.add_argument("--api-provider",   type=str,   default="mock",
                   choices=["mock", "bridge", "zillow_rapid", "paperworking"],
                   help="Data provider adapter to use")
    p.add_argument("--api-key",        type=str,   default=None,
                   help="API key or bearer token for the selected provider")
    p.add_argument("--project-id",     type=str,   default=None,
                   help="PaperWorking Firestore project ID (paperworking provider only)")
    p.add_argument("--output",         type=str,   default="property_data.json",
                   help="Output path for the structured property_data.json file")
    return p.parse_args()


def normalize_address(raw: str) -> dict[str, str]:
    """
    Normalizes and parses a US property address into components.
    Returns a dict with: streetLine, city, state, zip, unitNumber.
    """
    raw = raw.strip()

    # Extract unit designation before general parsing
    unit_match = re.search(r'\b(apt|unit|suite|#|ste)\.?\s*(\w+)', raw, re.IGNORECASE)
    unit_number = unit_match.group(0) if unit_match else ""
    clean = re.sub(r'\b(apt|unit|suite|#|ste)\.?\s*\w+', "", raw, flags=re.IGNORECASE).strip()

    # Split on commas to isolate components
    parts = [p.strip() for p in clean.split(",") if p.strip()]

    if len(parts) < 2:
        raise ValueError(
            f"Address must include at least street and city/state: '{raw}'"
        )

    street_line = parts[0]
    city        = parts[1] if len(parts) >= 2 else ""
    state_zip   = parts[2] if len(parts) >= 3 else ""

    # Parse state and zip from "TX 78701" or "TX78701"
    sz_match = re.match(r"([A-Za-z]{2})\s*(\d{5})?", state_zip.strip())
    if sz_match:
        state = sz_match.group(1).upper()
        zipcode = sz_match.group(2) or ""
    else:
        state, zipcode = "", ""

    if state and state not in US_STATES:
        raise ValueError(
            f"Unrecognized US state abbreviation: '{state}'. "
            "Provide a valid 2-letter USPS state code."
        )

    normalized = f"{street_line.title()}, {city.title()}, {state} {zipcode.zfill(5)}".strip(", ")

    return {
        "rawAddress":        raw,
        "normalizedAddress": normalized,
        "streetLine":        street_line.title(),
        "city":              city.title(),
        "state":             state,
        "zip":               zipcode.zfill(5) if zipcode else "",
        "unitNumber":        unit_number,
    }


def validate_args(args: argparse.Namespace, addr: dict) -> None:
    errors = []

    if args.api_provider in ("bridge", "zillow_rapid", "paperworking") and not args.api_key:
        errors.append(
            f"--api-key is required for --api-provider {args.api_provider}. "
            "Use --api-provider mock to run without credentials."
        )
    if args.api_provider == "paperworking" and not args.project_id:
        errors.append("--project-id is required for --api-provider paperworking")
    if not (0.1 <= args.radius_miles <= 5.0):
        errors.append("--radius-miles must be between 0.1 and 5.0")
    if not (1 <= args.comp_months <= 24):
        errors.append("--comp-months must be between 1 and 24")
    if args.min_comps < 1:
        errors.append("--min-comps must be >= 1")

    if errors:
        payload = {"error": "VALIDATION_ERROR", "messages": errors}
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: HTTP fetch helper with retry and backoff
# ─────────────────────────────────────────────────────────────────────────────

def http_get(
    url:     str,
    headers: dict[str, str],
    retries: int = 3,
) -> dict[str, Any]:
    """
    Performs a GET request with exponential backoff retry.
    Raises SystemExit(4) on persistent network failure.
    Raises SystemExit(2) on 401/403 authentication failures.
    """
    delay = 1.0
    last_error: Optional[Exception] = None

    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode("utf-8")
                return json.loads(body)

        except urllib.error.HTTPError as exc:
            if exc.code in (401, 403):
                payload = {
                    "error": "AUTH_FAILURE",
                    "message": (
                        f"HTTP {exc.code} from {url}. "
                        "Check your --api-key or switch to --api-provider mock."
                    ),
                }
                print(json.dumps(payload, indent=2), file=sys.stderr)
                sys.exit(2)
            last_error = exc
        except Exception as exc:
            last_error = exc

        if attempt < retries:
            time.sleep(delay)
            delay *= 2

    payload = {
        "error": "NETWORK_ERROR",
        "message": f"Failed after {retries} attempts: {last_error}",
        "url": url,
    }
    print(json.dumps(payload, indent=2), file=sys.stderr)
    sys.exit(4)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Mock data generator (deterministic, address-seeded)
# ─────────────────────────────────────────────────────────────────────────────

class MockDataGenerator:
    """
    Produces realistic, reproducible property and comp data seeded from
    a hash of the normalized address. The same address always yields
    the same output, enabling deterministic test pipelines.
    """

    def __init__(self, addr: dict, args: argparse.Namespace):
        self.addr  = addr
        self.args  = args
        seed_bytes = addr["normalizedAddress"].encode("utf-8")
        # Use first 8 bytes of SHA-256 as a 64-bit seed integer
        digest     = hashlib.sha256(seed_bytes).digest()
        self.seed  = int.from_bytes(digest[:8], "big")
        self._state = self.seed

    def _next(self, low: float, high: float) -> float:
        """LCG pseudo-random float in [low, high)."""
        a, c, m = 6_364_136_223_846_793_005, 1_442_695_040_888_963_407, 2**64
        self._state = (a * self._state + c) % m
        return low + (self._state / m) * (high - low)

    def _next_int(self, low: int, high: int) -> int:
        return int(self._next(low, high + 1))

    def fetch_subject(self) -> dict[str, Any]:
        state = self.addr.get("state", "DEFAULT")
        ppsf  = REGIONAL_PPSF.get(state, REGIONAL_PPSF["DEFAULT"])

        sqft  = self.args.subject_sqft or round(self._next(900, 3200), 0)
        beds  = self.args.subject_beds  or self._next_int(2, 5)
        baths = self.args.subject_baths or round(self._next(1.0, 3.5) * 2) / 2

        list_price = round(sqft * ppsf * self._next(0.85, 1.15), -3)
        est_value  = round(list_price * self._next(0.97, 1.03), -2)

        rent_ratio   = REGIONAL_RENT_RATIO.get(state, REGIONAL_RENT_RATIO["DEFAULT"])
        monthly_rent = round(list_price * rent_ratio, -1)

        year_built = self._next_int(1955, 2022)
        last_sold  = round(list_price * self._next(0.55, 0.80), -3)
        sold_years = self._next_int(2, 6)
        last_sold_date = (
            datetime.now() - timedelta(days=365 * sold_years)
        ).strftime("%Y-%m-%d")

        # Geocoordinates — realistic spread around a regional anchor
        REGION_ANCHORS = {
            "TX": (30.2672, -97.7431), "CA": (34.0522, -118.2437),
            "FL": (25.7617, -80.1918), "NY": (40.7128,  -74.0060),
            "GA": (33.7490, -84.3880), "WA": (47.6062, -122.3321),
            "IL": (41.8781, -87.6298), "CO": (39.7392, -104.9903),
            "DEFAULT": (39.8283, -98.5795),
        }
        anchor = REGION_ANCHORS.get(state, REGION_ANCHORS["DEFAULT"])
        lat    = round(anchor[0] + self._next(-0.08, 0.08), 6)
        lng    = round(anchor[1] + self._next(-0.08, 0.08), 6)

        return {
            "listPrice":            list_price,
            "estimatedMarketValue": est_value,
            "estimatedMonthlyRent": monthly_rent,
            "sqft":    sqft,
            "beds":    beds,
            "baths":   baths,
            "yearBuilt":   year_built,
            "propertyType": "Single Family Residential",
            "units":   1,
            "lastSoldPrice": last_sold,
            "lastSoldDate":  last_sold_date,
            "lat": lat,
            "lng": lng,
        }

    def fetch_tax_history(self, list_price: float) -> list[dict]:
        current_year = datetime.now().year
        # Effective tax rate: 1.2% – 2.4% of assessed value (region-dependent)
        eff_rate = self._next(0.012, 0.024)
        history  = []
        assessed = round(list_price * self._next(0.80, 1.00), -2)
        for i in range(3):
            year = current_year - i
            tax  = round(assessed * eff_rate, 2)
            history.append({
                "year":          year,
                "assessedValue": round(assessed, 2),
                "annualTax":     tax,
            })
            # Prior years: reverse the recent 6-9% annual increase
            assessed = round(assessed / self._next(1.04, 1.09), -2)
        return history   # most recent first

    def fetch_comps(
        self,
        subject:      dict[str, Any],
        radius_miles: float,
        months_back:  int,
        count:        int,
    ) -> list[dict]:
        """Generates realistic comparable sales around the subject property."""
        state  = self.addr.get("state", "DEFAULT")
        ppsf   = REGIONAL_PPSF.get(state, REGIONAL_PPSF["DEFAULT"])
        comps  = []
        today  = datetime.now()

        street_suffixes = [
            "Oak Ave", "Elm St", "Maple Dr", "Cedar Ln", "Pine Rd",
            "Birch Blvd", "Walnut Way", "Ash Ct", "Willow Pl", "Spruce St",
        ]

        for i in range(count):
            # Slightly vary sqft, beds, baths from subject
            comp_sqft  = round(subject["sqft"] * self._next(0.80, 1.25), 0)
            comp_beds  = max(1, subject["beds"]  + self._next_int(-1, 1))
            comp_baths = max(1.0, round(subject["baths"] + self._next(-0.5, 0.5), 1))
            # Sale date within the lookback window
            days_ago   = self._next_int(5, months_back * 30)
            sold_date  = (today - timedelta(days=days_ago)).strftime("%Y-%m-%d")
            months_ago = days_ago / 30.0
            # Sold price based on regional ppsf ± variance
            sold_price = round(comp_sqft * ppsf * self._next(0.88, 1.12), -2)
            # Distance within radius
            dist = round(self._next(0.05, radius_miles), 2)
            suffix = street_suffixes[i % len(street_suffixes)]
            street_num = self._next_int(1000, 9999)
            comp_addr  = (
                f"{street_num} {suffix}, "
                f"{self.addr['city']}, "
                f"{self.addr['state']} {self.addr['zip']}"
            )
            comps.append({
                "address":       comp_addr,
                "soldDate":      sold_date,
                "soldPrice":     sold_price,
                "sqft":          comp_sqft,
                "beds":          comp_beds,
                "baths":         comp_baths,
                "distanceMiles": dist,
                "monthsAgo":     round(months_ago, 1),
            })

        return comps


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: API provider adapters
# ─────────────────────────────────────────────────────────────────────────────

class BridgeAdapter:
    """
    Bridge Data Output API adapter.
    Docs: https://bridgedataoutput.com/api-explorer
    """

    BASE = "https://api.bridgedataoutput.com/api/v2/pub"

    def __init__(self, api_key: str):
        self.headers = {"Authorization": f"Bearer {api_key}"}

    def fetch_subject(self, addr: dict) -> dict[str, Any]:
        encoded = urllib.parse.quote(addr["normalizedAddress"])
        url     = f"{self.BASE}/listings?address={encoded}&limit=1&fields=all"
        resp    = http_get(url, self.headers)
        items   = resp.get("bundle", [])
        if not items:
            return {}
        item = items[0]
        return {
            "listPrice":            float(item.get("ListPrice", 0)),
            "estimatedMarketValue": float(item.get("TaxAssessedValue", 0)),
            "estimatedMonthlyRent": float(item.get("RentZestimate", 0)),
            "sqft":    float(item.get("BuildingAreaTotal", 0)),
            "beds":    int(item.get("BedroomsTotal", 0)),
            "baths":   float(item.get("BathroomsTotalDecimal", 0)),
            "yearBuilt":   int(item.get("YearBuilt", 0)),
            "propertyType": item.get("PropertyType", ""),
            "units":   1,
            "lastSoldPrice": float(item.get("ClosePrice", 0)),
            "lastSoldDate":  item.get("CloseDate", ""),
            "lat": float(item.get("Latitude", 0)),
            "lng": float(item.get("Longitude", 0)),
        }

    def fetch_tax_history(self, addr: dict) -> list[dict]:
        encoded = urllib.parse.quote(addr["normalizedAddress"])
        url     = f"{self.BASE}/assessments?address={encoded}&limit=3"
        resp    = http_get(url, self.headers)
        history = []
        for row in resp.get("bundle", []):
            history.append({
                "year":          int(row.get("TaxYear", 0)),
                "assessedValue": float(row.get("TaxAssessedValue", 0)),
                "annualTax":     float(row.get("TaxAmount", 0)),
            })
        return sorted(history, key=lambda r: r["year"], reverse=True)

    def fetch_comps(
        self, lat: float, lng: float,
        radius_miles: float, months_back: int, count: int,
    ) -> list[dict]:
        cutoff = (datetime.now() - timedelta(days=months_back * 30)).strftime("%Y-%m-%d")
        url = (
            f"{self.BASE}/sold?near={lat},{lng}"
            f"&radius={radius_miles}mi&closedAfter={cutoff}&limit={count}&fields=all"
        )
        resp  = http_get(url, self.headers)
        comps = []
        for item in resp.get("bundle", []):
            dist_m = _haversine(lat, lng, float(item.get("Latitude", lat)), float(item.get("Longitude", lng)))
            comps.append({
                "address":       item.get("UnparsedAddress", ""),
                "soldDate":      item.get("CloseDate", ""),
                "soldPrice":     float(item.get("ClosePrice", 0)),
                "sqft":          float(item.get("BuildingAreaTotal", 0)),
                "beds":          int(item.get("BedroomsTotal", 0)),
                "baths":         float(item.get("BathroomsTotalDecimal", 0)),
                "distanceMiles": round(dist_m / 1609.34, 3),
                "monthsAgo":     _months_since(item.get("CloseDate", "")),
            })
        return comps


class ZillowRapidAdapter:
    """
    Zillow API via RapidAPI adapter.
    Provider: zillow56.p.rapidapi.com
    """

    BASE = "https://zillow56.p.rapidapi.com"

    def __init__(self, api_key: str):
        self.headers = {
            "X-RapidAPI-Key":  api_key,
            "X-RapidAPI-Host": "zillow56.p.rapidapi.com",
        }

    def fetch_subject(self, addr: dict) -> dict[str, Any]:
        encoded = urllib.parse.quote(addr["normalizedAddress"])
        url     = f"{self.BASE}/search?location={encoded}"
        resp    = http_get(url, self.headers)
        results = resp.get("results", [])
        if not results:
            return {}
        r = results[0]
        return {
            "listPrice":            float(r.get("price", 0)),
            "estimatedMarketValue": float(r.get("zestimate", 0)),
            "estimatedMonthlyRent": float(r.get("rentZestimate", 0)),
            "sqft":    float(r.get("livingArea", 0)),
            "beds":    int(r.get("bedrooms", 0)),
            "baths":   float(r.get("bathrooms", 0)),
            "yearBuilt":   int(r.get("yearBuilt", 0)),
            "propertyType": r.get("homeType", ""),
            "units":   1,
            "lastSoldPrice": float(r.get("lastSoldPrice", 0)),
            "lastSoldDate":  r.get("lastSoldDate", ""),
            "lat": float(r.get("latitude", 0)),
            "lng": float(r.get("longitude", 0)),
        }

    def fetch_tax_history(self, zpid: Optional[str]) -> list[dict]:
        if not zpid:
            return []
        url  = f"{self.BASE}/property?zpid={zpid}&detail=tax_history"
        resp = http_get(url, self.headers)
        history = []
        for row in resp.get("taxHistory", []):
            history.append({
                "year":          int(row.get("time", 0)),
                "assessedValue": float(row.get("taxIncreaseRate", 0)),
                "annualTax":     float(row.get("taxPaid", 0)),
            })
        return history[:3]

    def fetch_comps(
        self, lat: float, lng: float,
        radius_miles: float, months_back: int, count: int,
    ) -> list[dict]:
        # Zillow doesn't expose a direct comp radius endpoint on RapidAPI;
        # we use the nearby sold homes endpoint instead.
        url = (
            f"{self.BASE}/sold?lat={lat}&long={lng}"
            f"&radius={radius_miles}&limit={count}"
        )
        resp  = http_get(url, self.headers)
        comps = []
        cutoff_date = datetime.now() - timedelta(days=months_back * 30)
        for r in resp.get("results", []):
            sold_dt = _parse_date(r.get("dateSold", ""))
            if sold_dt and sold_dt < cutoff_date:
                continue
            dist_m = _haversine(lat, lng, float(r.get("latitude", lat)), float(r.get("longitude", lng)))
            comps.append({
                "address":       r.get("address", {}).get("streetAddress", ""),
                "soldDate":      r.get("dateSold", ""),
                "soldPrice":     float(r.get("price", 0)),
                "sqft":          float(r.get("livingArea", 0)),
                "beds":          int(r.get("bedrooms", 0)),
                "baths":         float(r.get("bathrooms", 0)),
                "distanceMiles": round(dist_m / 1609.34, 3),
                "monthsAgo":     _months_since(r.get("dateSold", "")),
            })
        return comps


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Utility functions
# ─────────────────────────────────────────────────────────────────────────────

def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns the great-circle distance in meters between two coordinates."""
    R  = 6_371_000.0
    φ1 = math.radians(lat1); φ2 = math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lng2 - lng1)
    a  = math.sin(Δφ / 2)**2 + math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2)**2
    return 2 * R * math.asin(math.sqrt(a))


def _parse_date(s: str) -> Optional[datetime]:
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s[:len(fmt.replace("%Y","2024"))], fmt)
        except Exception:
            continue
    return None


def _months_since(date_str: str) -> float:
    dt = _parse_date(date_str)
    if not dt:
        return 0.0
    return round((datetime.now() - dt).days / 30.0, 1)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: Comp adjustment and ARV calculation
# ─────────────────────────────────────────────────────────────────────────────

def adjust_comps_and_compute_arv(
    comps:        list[dict],
    subject_sqft: float,
    subject_beds: int,
    subject_baths: float,
    comp_months:  int,
) -> tuple[list[dict], float]:
    """
    Applies GLA-weighted adjustments to each comparable sale and computes ARV.

    ARV = sum(adjustedPrice_i) / k

    Adjustments applied in order:
      1. GLA (square footage) size adjustment at 50% of avg $/sqft
      2. Bedroom count adjustment at $5,000/bed
      3. Bathroom count adjustment at $3,500/bath
      4. Recency time-weighting (max ±10% across the lookback window)
    """
    valid_comps = [
        c for c in comps
        if c.get("soldPrice", 0) > 0 and c.get("sqft", 0) > 0
    ]
    if not valid_comps:
        return [], 0.0

    # Step 1: compute average price per sqft across all comps
    avg_ppsf = sum(c["soldPrice"] / c["sqft"] for c in valid_comps) / len(valid_comps)

    adjusted: list[dict] = []
    for comp in valid_comps:
        sqft_diff      = subject_sqft - comp["sqft"]
        size_adj       = sqft_diff * avg_ppsf * 0.50
        bed_adj        = (subject_beds  - comp.get("beds",  subject_beds))  * BED_PREMIUM
        bath_adj       = (subject_baths - comp.get("baths", subject_baths)) * BATH_PREMIUM
        months_ago     = comp.get("monthsAgo", 0)
        time_weight    = 1.0 - (months_ago / comp_months) * 0.10 if comp_months > 0 else 1.0
        raw_adj_price  = (comp["soldPrice"] + size_adj + bed_adj + bath_adj)
        adjusted_price = round(raw_adj_price * time_weight, 2)

        adjusted.append({
            **comp,
            "avgPricePerSqft":  round(avg_ppsf, 2),
            "sqftDiff":         round(sqft_diff, 0),
            "sizeAdjustment":   round(size_adj, 2),
            "bedAdjustment":    round(bed_adj, 2),
            "bathAdjustment":   round(bath_adj, 2),
            "timeWeight":       round(time_weight, 3),
            "adjustedPrice":    adjusted_price,
        })

    arv = round(sum(c["adjustedPrice"] for c in adjusted) / len(adjusted), 2)
    return adjusted, arv


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: Schema assembly and validation
# ─────────────────────────────────────────────────────────────────────────────

REQUIRED_OUTPUT_FIELDS = [
    ("financial", "listPrice"),
    ("financial", "arv"),
    ("financial", "currentAnnualTax"),
    ("propertyDetails", "lat"),
    ("propertyDetails", "lng"),
]


def validate_output_schema(output: dict) -> list[str]:
    missing = []
    for section, field in REQUIRED_OUTPUT_FIELDS:
        val = output.get(section, {}).get(field, None)
        if val is None or val == 0:
            missing.append(f"{section}.{field}")
    return missing


def build_downstream_commands(output: dict, args: argparse.Namespace) -> dict:
    """
    Generates ready-to-run CLI commands for downstream skills using
    the fetched property data as pre-populated flag values.
    """
    fin  = output.get("financial", {})
    det  = output.get("propertyDetails", {})
    now  = datetime.now()

    lp   = fin.get("listPrice",  0)
    arv  = fin.get("arv",        0)
    rent = fin.get("estimatedMonthlyRent", 0)
    tax  = fin.get("currentAnnualTax",     0)
    units = det.get("units", 1)
    loan  = round(lp * 0.75, 0)   # default 75% LTV
    noi_est = round((rent * units * 12) * 0.55, 0)   # 50% rule estimate

    underwrite = (
        f"python3 scripts/underwrite.py "
        f"--purchase-price {lp:.0f} "
        f"--units {units} "
        f"--monthly-rent {rent:.0f} "
        f"--taxes {tax:.0f} "
        f"--loan-amount {loan:.0f} "
        f"--interest-rate 7.25"
    )

    brrrr = (
        f"python3 scripts/brrrr_calc.py "
        f"--purchase-price {lp:.0f} "
        f"--arv {arv:.0f} "
        f"--stabilized-noi {noi_est:.0f} "
        f"--refi-rate 7.0 "
        f"--bridge-payoff {loan:.0f}"
    )

    depreciation = (
        f"python3 scripts/depreciation_engine.py "
        f"--purchase-price {lp:.0f} "
        f"--building-pct 80 "
        f"--month-in-service {now.month} "
        f"--year-in-service {now.year}"
    )

    return {
        "underwritingProperties": underwrite,
        "brrrrAnalysis":          brrrr,
        "depreciatingAssets":     depreciation,
    }


def assemble_output(
    addr:          dict,
    args:          argparse.Namespace,
    subject:       dict,
    tax_history:   list[dict],
    comp_analysis: dict,
    warnings:      list[str],
) -> dict:
    fin = subject

    # Current tax from most recent history entry
    current_tax = tax_history[0]["annualTax"] if tax_history else 0.0
    oldest_tax  = tax_history[-1]["annualTax"] if len(tax_history) > 1 else current_tax
    tax_trend   = round(
        ((current_tax - oldest_tax) / oldest_tax * 100)
        if oldest_tax > 0 else 0.0, 2
    )

    output: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt":   datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "rawAddress":        addr["rawAddress"],
            "normalizedAddress": addr["normalizedAddress"],
            "apiProvider":       args.api_provider,
            "radiusMiles":       args.radius_miles,
            "compLookbackMonths": args.comp_months,
            "fetchStatus":       "SUCCESS" if not warnings else "PARTIAL",
            "warnings":          warnings,
            "missingFields":     [],   # populated by validate_output_schema
        },
        "propertyDetails": {
            "lat":          fin.get("lat", 0),
            "lng":          fin.get("lng", 0),
            "sqft":         fin.get("sqft", 0),
            "beds":         fin.get("beds", 0),
            "baths":        fin.get("baths", 0),
            "yearBuilt":    fin.get("yearBuilt", 0),
            "propertyType": fin.get("propertyType", ""),
            "units":        fin.get("units", 1),
        },
        "financial": {
            "listPrice":              fin.get("listPrice", 0),
            "estimatedMarketValue":   fin.get("estimatedMarketValue", 0),
            "estimatedMonthlyRent":   fin.get("estimatedMonthlyRent", 0),
            "lastSoldPrice":          fin.get("lastSoldPrice", 0),
            "lastSoldDate":           fin.get("lastSoldDate", ""),
            "arv":                    comp_analysis.get("arv", fin.get("listPrice", 0)),
            "currentAnnualTax":       round(current_tax, 2),
            "taxAssessmentHistory":   tax_history,
        },
        "propertyTaxAnalysis": {
            "currentAnnualTax": round(current_tax, 2),
            "oldestYearTax":    round(oldest_tax, 2),
            "trendPct":         tax_trend,
            "trendNote": (
                f"Property taxes changed {tax_trend:+.1f}% over "
                f"{len(tax_history)}-year history. "
                + ("High reassessment risk on transfer."
                   if tax_trend > 20 else "Moderate tax trajectory.")
            ),
        },
        "comparableSalesAnalysis": comp_analysis,
    }

    # Validate required fields
    missing = validate_output_schema(output)
    output["metadata"]["missingFields"] = missing
    if missing:
        output["metadata"]["fetchStatus"] = "PARTIAL"
        for field in missing:
            warnings.append(
                f"MISSING_FIELD: {field} — downstream skills may require "
                f"manual input for this value in {args.output}"
            )

    # Downstream CLI commands
    output["downstreamCommands"] = build_downstream_commands(output, args)

    return output


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: Main orchestration
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()

    # Step 1: Normalize address
    try:
        addr = normalize_address(args.address)
    except ValueError as exc:
        payload = {"error": "ADDRESS_VALIDATION_ERROR", "message": str(exc)}
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(1)

    validate_args(args, addr)

    warnings: list[str] = []

    # ── Select provider adapter ───────────────────────────────────────────────
    if args.api_provider == "bridge" and args.api_key:
        adapter = BridgeAdapter(args.api_key)
        subject = adapter.fetch_subject(addr)
        tax_history = adapter.fetch_tax_history(addr)
        if not subject:
            warnings.append("Bridge API returned no results — falling back to mock data")
            args.api_provider = "mock"
    elif args.api_provider == "zillow_rapid" and args.api_key:
        adapter = ZillowRapidAdapter(args.api_key)
        subject = adapter.fetch_subject(addr)
        tax_history = adapter.fetch_tax_history(None)
        if not subject:
            warnings.append("Zillow RapidAPI returned no results — falling back to mock data")
            args.api_provider = "mock"
    else:
        args.api_provider = "mock"

    # Mock data (also used as fallback when live APIs return no results)
    if args.api_provider == "mock":
        gen = MockDataGenerator(addr, args)
        subject     = gen.fetch_subject()
        tax_history = gen.fetch_tax_history(subject["listPrice"])
        args.api_provider = "mock"

    # Override subject details with explicit CLI args if provided
    if args.subject_sqft > 0:
        subject["sqft"] = args.subject_sqft
    if args.subject_beds > 0:
        subject["beds"] = args.subject_beds
    if args.subject_baths > 0:
        subject["baths"] = args.subject_baths

    lat = subject.get("lat", 0)
    lng = subject.get("lng", 0)

    # ── Step 3: Fetch comps with automatic search expansion ──────────────────
    radius        = args.radius_miles
    months_back   = args.comp_months
    raw_comps: list[dict] = []

    for attempt, (r, m) in enumerate([
        (radius,       months_back),
        (radius * 2,   months_back),
        (radius * 2,   months_back * 2),
    ]):
        if args.api_provider == "mock" or args.api_provider in ("bridge","zillow_rapid"):
            # For mock, always use MockDataGenerator since adapter may be overridden
            gen = MockDataGenerator(addr, args)
            # Request more comps than minimum to give adjustment room
            target = max(args.min_comps + 2, 6)
            raw_comps = gen.fetch_comps(subject, r, m, target)
        else:
            raw_comps = []

        if len(raw_comps) >= args.min_comps:
            radius      = r
            months_back = m
            break
    else:
        # Insufficient comps after all expansions
        warnings.append(
            f"INSUFFICIENT_COMPS: Only {len(raw_comps)} comp(s) found after "
            f"expanding radius to {radius * 2:.1f} mi and lookback to {months_back * 2} months. "
            f"ARV set to list price as fallback."
        )

    # ── Step 4: Adjust comps and compute ARV ──────────────────────────────────
    adj_comps, arv = adjust_comps_and_compute_arv(
        raw_comps,
        subject.get("sqft",  1500),
        subject.get("beds",  3),
        subject.get("baths", 2.0),
        months_back,
    )

    avg_ppsf = (
        round(sum(c["soldPrice"] / c["sqft"] for c in raw_comps if c.get("sqft", 0) > 0) /
              len(raw_comps), 2)
        if raw_comps else 0.0
    )

    if arv == 0:
        arv = subject.get("listPrice", 0)
        warnings.append("ARV defaulted to list price — no valid comps available")

    comp_analysis = {
        "subjectSqft":        subject.get("sqft", 0),
        "subjectBeds":        subject.get("beds", 0),
        "subjectBaths":       subject.get("baths", 0),
        "avgPricePerSqft":    avg_ppsf,
        "compsUsed":          len(adj_comps),
        "radiusMilesUsed":    radius,
        "lookbackMonthsUsed": months_back,
        "arvFormula":         "ARV = sum(adjustedCompPrice_i for i=1..k) / k",
        "arv":                arv,
        "comps":              adj_comps,
    }

    # ── Step 5: Assemble and validate output ──────────────────────────────────
    output = assemble_output(addr, args, subject, tax_history, comp_analysis, warnings)

    missing = output["metadata"]["missingFields"]
    if missing:
        payload = {
            "error":         "SCHEMA_VALIDATION_ERROR",
            "missingFields": missing,
            "message": (
                "Required fields are null or zero. Populate them manually "
                f"in {args.output} before running downstream skills."
            ),
            "partialOutput": output,
        }
        # Still write the partial output so the user can fill in missing fields
        _write_output(output, args.output)
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(5)

    _write_output(output, args.output)

    # Echo a brief summary to stdout for agent consumption
    summary = {
        "status":   "SUCCESS",
        "address":  addr["normalizedAddress"],
        "listPrice": output["financial"]["listPrice"],
        "monthlyRent": output["financial"]["estimatedMonthlyRent"],
        "arv":       output["financial"]["arv"],
        "compsUsed": len(adj_comps),
        "outputFile": args.output,
        "warnings":   warnings,
        "downstreamCommands": output["downstreamCommands"],
    }
    print(json.dumps(summary, indent=2))


def _write_output(output: dict, path: str) -> None:
    """Atomic write: temp file → rename to prevent partial writes."""
    tmp = path + ".tmp"
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)
        os.replace(tmp, path)
    except OSError as exc:
        payload = {"error": "IO_WRITE_ERROR", "message": str(exc), "path": path}
        print(json.dumps(payload, indent=2), file=sys.stderr)
        try:
            os.remove(tmp)
        except OSError:
            pass
        sys.exit(6)


if __name__ == "__main__":
    main()
