#!/usr/bin/env python3
"""
depreciation_engine.py — PaperWorking IRS MACRS Depreciation Engine
=====================================================================
Generates IRS-compliant MACRS depreciation schedules for real estate assets.

Implements:
  - 27.5-year Residential Rental Property (SL, Mid-Month Convention)
  - 39-year Non-Residential Commercial Real Property (SL, Mid-Month Convention)
  - 5-year Personal Property (200% DB, Half-Year Convention)  [cost segregation]
  - 15-year Land Improvements (150% DB, Half-Year Convention) [cost segregation]

All percentage tables are sourced verbatim from IRS Publication 946,
Appendix A, Tables A-1, A-6, and A-7. Using computed approximations
instead of the published table values will produce amounts that diverge
from IRS-expected figures and will not pass audit scrutiny.

Usage:
    python3 scripts/depreciation_engine.py \\
        --purchase-price 500000 \\
        --capitalized-closing 8000 \\
        --building-pct 80.0 \\
        --property-class res27_5 \\
        --month-in-service 7 \\
        --year-in-service 2024 \\
        --projection-years 10 \\
        --personal-prop-basis 25000 \\
        --land-improve-basis 15000

Exit codes:
    0 — Success, valid JSON on stdout
    1 — Input validation error
    2 — Basis allocation integrity error
    3 — I/O write error
"""

import argparse
import json
import sys
from datetime import datetime, timezone


SCHEMA_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: IRS MACRS Percentage Tables (verbatim from IRS Publication 946)
# ─────────────────────────────────────────────────────────────────────────────

# ── Table A-6: 27.5-Year Residential Rental Property ─────────────────────────
# Mid-Month Convention, Straight-Line Method
# Source: IRS Publication 946, Appendix A

# Year 1 percentages keyed by month placed in service (1 = January)
MACRS_27_5_YEAR1: dict[int, float] = {
    1:  3.458,   # January   — 11.5 months in Year 1
    2:  3.182,   # February  — 10.5 months
    3:  2.879,   # March     —  9.5 months
    4:  2.576,   # April     —  8.5 months
    5:  2.273,   # May       —  7.5 months
    6:  1.970,   # June      —  6.5 months
    7:  1.667,   # July      —  5.5 months
    8:  1.364,   # August    —  4.5 months
    9:  1.061,   # September —  3.5 months
    10: 0.758,   # October   —  2.5 months
    11: 0.455,   # November  —  1.5 months
    12: 0.152,   # December  —  0.5 months
}

# Year 28 partial-year percentages (completes the recovery for early months)
MACRS_27_5_YEAR28: dict[int, float] = {
    1:  1.970,
    2:  2.273,
    3:  2.576,
    4:  2.879,
    5:  3.182,
    6:  3.485,
    7:  3.636,
    8:  3.636,
    9:  3.636,
    10: 3.636,
    11: 3.636,
    12: 3.636,
}

# Year 29 percentages (only months 7-12 have non-zero amounts)
MACRS_27_5_YEAR29: dict[int, float] = {
    1:  0.000,
    2:  0.000,
    3:  0.000,
    4:  0.000,
    5:  0.000,
    6:  0.000,
    7:  0.152,
    8:  0.455,
    9:  0.758,
    10: 1.061,
    11: 1.364,
    12: 1.667,
}


def macrs_27_5_pct(month: int, recovery_year: int) -> float:
    """
    Returns the exact IRS MACRS 27.5-year percentage for a given recovery year
    and the month the property was placed in service.

    Intermediate year pattern (Years 2–27):
      Years 2–9:
        All months use 3.636% (standard 1/27.5 straight-line rate)

      Years 10–27 for months 1–6 placed in service:
        Even recovery year → 3.637%
        Odd  recovery year → 3.636%

      Years 10–27 for months 7–12 placed in service:
        Even recovery year → 3.636%
        Odd  recovery year → 3.637%

    This alternating pattern ensures the cumulative percentages sum to
    exactly 100% of the depreciable basis over the full recovery period,
    correcting for the repeating decimal in 1/27.5 = 3.63636...%.
    """
    if recovery_year == 1:
        return MACRS_27_5_YEAR1[month]

    if 2 <= recovery_year <= 9:
        return 3.636

    if 10 <= recovery_year <= 27:
        is_even = recovery_year % 2 == 0
        if month <= 6:
            return 3.637 if is_even else 3.636
        else:
            return 3.636 if is_even else 3.637

    if recovery_year == 28:
        return MACRS_27_5_YEAR28[month]

    if recovery_year == 29:
        return MACRS_27_5_YEAR29[month]

    return 0.0   # Beyond recovery period


# ── Table A-7: 39-Year Non-Residential Commercial Real Property ───────────────
# Mid-Month Convention, Straight-Line Method
# Source: IRS Publication 946, Appendix A

MACRS_39_YEAR1: dict[int, float] = {
    1:  2.461,   # January   — 11.5/12 of annual rate
    2:  2.247,   # February  — 10.5/12
    3:  2.033,   # March     —  9.5/12
    4:  1.819,   # April     —  8.5/12
    5:  1.605,   # May       —  7.5/12
    6:  1.391,   # June      —  6.5/12
    7:  1.177,   # July      —  5.5/12
    8:  0.963,   # August    —  4.5/12
    9:  0.749,   # September —  3.5/12
    10: 0.535,   # October   —  2.5/12
    11: 0.321,   # November  —  1.5/12
    12: 0.107,   # December  —  0.5/12
}

# Year 40: mirror of Year 1 (the remaining partial year)
MACRS_39_YEAR40: dict[int, float] = {
    1:  0.107,
    2:  0.321,
    3:  0.535,
    4:  0.749,
    5:  0.963,
    6:  1.177,
    7:  1.391,
    8:  1.605,
    9:  1.819,
    10: 2.033,
    11: 2.247,
    12: 2.461,
}


def macrs_39_pct(month: int, recovery_year: int) -> float:
    """
    Returns the exact IRS MACRS 39-year commercial property percentage.

    Year 1:       Month-specific mid-month factor from MACRS_39_YEAR1
    Years 2–39:   2.564% (1/39 straight-line, all months uniform)
    Year 40:      Month-specific partial-year factor from MACRS_39_YEAR40
    """
    if recovery_year == 1:
        return MACRS_39_YEAR1[month]

    if 2 <= recovery_year <= 39:
        return 2.564

    if recovery_year == 40:
        return MACRS_39_YEAR40[month]

    return 0.0


# ── Table A-1: 5-Year Personal Property (200% DB, Half-Year Convention) ───────
# Source: IRS Publication 946, Appendix A, Table A-1

MACRS_5YR_HALFYEAR: list[float] = [
    20.00,   # Year 1  — 200%/5 = 40%; half-year = 20.00%
    32.00,   # Year 2  — 200%/5 × (remaining basis after Y1)
    19.20,   # Year 3  — switches to SL when SL exceeds DB
    11.52,   # Year 4
    11.52,   # Year 5
     5.76,   # Year 6  — half-year convention disposition year
]


def macrs_5yr_pct(recovery_year: int) -> float:
    """Returns the 5-year 200% DB half-year convention annual percentage."""
    if 1 <= recovery_year <= len(MACRS_5YR_HALFYEAR):
        return MACRS_5YR_HALFYEAR[recovery_year - 1]
    return 0.0


# ── Table A-1: 15-Year Land Improvements (150% DB, Half-Year Convention) ──────
# Source: IRS Publication 946, Appendix A, Table A-1

MACRS_15YR_HALFYEAR: list[float] = [
     5.00,   # Year 1  — 150%/15 = 10%; half-year = 5.00%
     9.50,   # Year 2
     8.55,   # Year 3
     7.70,   # Year 4
     6.93,   # Year 5
     6.23,   # Year 6
     5.90,   # Year 7  — switches to SL when SL exceeds DB
     5.90,   # Year 8
     5.91,   # Year 9
     5.90,   # Year 10
     5.91,   # Year 11
     5.90,   # Year 12
     5.91,   # Year 13
     5.90,   # Year 14
     5.91,   # Year 15
     2.95,   # Year 16 — half-year convention disposition year
]


def macrs_15yr_pct(recovery_year: int) -> float:
    """Returns the 15-year 150% DB half-year convention annual percentage."""
    if 1 <= recovery_year <= len(MACRS_15YR_HALFYEAR):
        return MACRS_15YR_HALFYEAR[recovery_year - 1]
    return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Argument parsing and validation
# ─────────────────────────────────────────────────────────────────────────────

VALID_PROPERTY_CLASSES = {"res27_5", "comm39"}
MONTH_NAMES = {
    1: "January", 2: "February", 3: "March",    4: "April",
    5: "May",     6: "June",     7: "July",      8: "August",
    9: "September", 10: "October", 11: "November", 12: "December",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="PaperWorking IRS MACRS Depreciation Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # ── Basis inputs ──────────────────────────────────────────────────────────
    p.add_argument("--purchase-price",      type=float, required=True,
                   help="Total property purchase price in dollars")
    p.add_argument("--capitalized-closing", type=float, default=0.0,
                   help="Eligible capitalized closing costs (title, legal, recording) in dollars")
    p.add_argument("--building-pct",        type=float, default=80.0,
                   help="Building allocation percentage (from assessor or appraisal); land = 100 - building_pct")

    # ── Property classification ───────────────────────────────────────────────
    p.add_argument("--property-class",      type=str,   default="res27_5",
                   choices=list(VALID_PROPERTY_CLASSES),
                   help="res27_5 = residential 27.5-year; comm39 = commercial 39-year")
    p.add_argument("--month-in-service",    type=int,   required=True,
                   help="Month property was placed in service (1=Jan … 12=Dec)")
    p.add_argument("--year-in-service",     type=int,   required=True,
                   help="Calendar year property was placed in service (e.g. 2024)")

    # ── Projection ───────────────────────────────────────────────────────────
    p.add_argument("--projection-years",    type=int,   default=10,
                   help="Number of years to project in the schedule (1-40)")

    # ── Cost segregation components (optional) ────────────────────────────────
    p.add_argument("--personal-prop-basis", type=float, default=0.0,
                   help="5-year personal property basis (appliances, carpet, furniture) in dollars")
    p.add_argument("--land-improve-basis",  type=float, default=0.0,
                   help="15-year land improvements basis (sidewalks, fences, parking) in dollars")

    # ── Output ────────────────────────────────────────────────────────────────
    p.add_argument("--output",              type=str,   default=None,
                   help="Write JSON to this file path instead of stdout")

    return p.parse_args()


def validate(args: argparse.Namespace) -> None:
    errors = []

    if args.purchase_price <= 0:
        errors.append("--purchase-price must be > 0")
    if args.capitalized_closing < 0:
        errors.append("--capitalized-closing must be >= 0")
    if not (0 < args.building_pct < 100):
        errors.append("--building-pct must be between 0 and 100 (exclusive)")
    if not (1 <= args.month_in_service <= 12):
        errors.append("--month-in-service must be 1 (January) through 12 (December)")
    if args.year_in_service < 1900 or args.year_in_service > 2100:
        errors.append("--year-in-service must be a valid four-digit year")
    if not (1 <= args.projection_years <= 40):
        errors.append("--projection-years must be between 1 and 40")
    if args.personal_prop_basis < 0:
        errors.append("--personal-prop-basis must be >= 0")
    if args.land_improve_basis < 0:
        errors.append("--land-improve-basis must be >= 0")

    if errors:
        payload = {"error": "VALIDATION_ERROR", "messages": errors}
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Basis isolation
# ─────────────────────────────────────────────────────────────────────────────

def compute_basis(args: argparse.Namespace) -> dict:
    """
    Isolates the depreciable building basis from the total acquisition cost.

    Depreciable Basis = (purchasePrice + capitalizedClosingCosts) × buildingPct

    The land component is strictly non-depreciable (IRC § 167).
    Capitalized closing costs increase the basis; currently deductible closing
    costs (origination points, pre-paid interest) are excluded.
    """
    total_cost_basis   = round(args.purchase_price + args.capitalized_closing, 2)
    land_pct           = 100.0 - args.building_pct
    depreciable_basis  = round(total_cost_basis * (args.building_pct / 100.0), 2)
    land_basis         = round(total_cost_basis * (land_pct / 100.0), 2)

    # Integrity check: components must sum to total
    component_sum = round(depreciable_basis + land_basis, 2)
    if abs(component_sum - total_cost_basis) > 0.02:
        payload = {
            "error": "BASIS_ALLOCATION_ERROR",
            "message": (
                f"Building basis (${depreciable_basis:,.2f}) + "
                f"land basis (${land_basis:,.2f}) = ${component_sum:,.2f}, "
                f"which does not equal total cost basis (${total_cost_basis:,.2f}). "
                "Check --building-pct allocation."
            ),
        }
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(2)

    return {
        "purchasePrice":       args.purchase_price,
        "capitalizedClosing":  args.capitalized_closing,
        "totalCostBasis":      total_cost_basis,
        "buildingPct":         args.building_pct,
        "landPct":             round(land_pct, 2),
        "depreciableBasis":    depreciable_basis,
        "landBasis":           land_basis,
        "personalPropBasis":   args.personal_prop_basis,
        "landImproveBasis":    args.land_improve_basis,
        "note": (
            f"Land basis (${land_basis:,.2f}) is non-depreciable per IRC § 167. "
            f"Building basis (${depreciable_basis:,.2f}) subject to MACRS cost recovery."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Schedule generation
# ─────────────────────────────────────────────────────────────────────────────

def build_depreciation_schedule(
    args:        argparse.Namespace,
    basis:       dict,
) -> list[dict]:
    """
    Generates a year-by-year depreciation schedule for the full projection period.

    For each recovery year 1..N:
      - Looks up the exact IRS MACRS percentage for the building component
      - Applies 5-year and 15-year table percentages for cost segregation components
      - Aggregates all components into a totalDepreciation row
      - Tracks cumulative depreciation and remaining depreciable basis

    Recovery years are mapped to calendar years using year_in_service as the anchor.
    """
    depreciable_basis   = basis["depreciableBasis"]
    personal_basis      = basis["personalPropBasis"]
    land_improve_basis  = basis["landImproveBasis"]
    month               = args.month_in_service
    property_class      = args.property_class

    schedule: list[dict] = []
    cumulative_depr = 0.0
    remaining_basis = depreciable_basis

    max_recovery = 29 if property_class == "res27_5" else 40

    for ry in range(1, args.projection_years + 1):
        calendar_year = args.year_in_service + (ry - 1)

        # ── Building structure depreciation ───────────────────────────────────
        if ry <= max_recovery:
            if property_class == "res27_5":
                macrs_pct = macrs_27_5_pct(month, ry)
            else:
                macrs_pct = macrs_39_pct(month, ry)
        else:
            macrs_pct = 0.0

        building_depr = round(depreciable_basis * (macrs_pct / 100.0), 2)

        # ── Personal property (5-year 200% DB) ───────────────────────────────
        pp_pct   = macrs_5yr_pct(ry) if personal_basis > 0 else 0.0
        pp_depr  = round(personal_basis * (pp_pct / 100.0), 2)

        # ── Land improvements (15-year 150% DB) ──────────────────────────────
        li_pct   = macrs_15yr_pct(ry) if land_improve_basis > 0 else 0.0
        li_depr  = round(land_improve_basis * (li_pct / 100.0), 2)

        # ── Aggregate and track ───────────────────────────────────────────────
        total_depr      = round(building_depr + pp_depr + li_depr, 2)
        cumulative_depr = round(cumulative_depr + total_depr, 2)
        remaining_basis = round(remaining_basis - building_depr, 2)

        schedule.append({
            "recoveryYear":           ry,
            "calendarYear":           calendar_year,
            "macrsYearPct":           macrs_pct,
            "buildingDepreciation":   building_depr,
            "personalPropPct":        pp_pct,
            "personalPropDepr":       pp_depr,
            "landImprovePct":         li_pct,
            "landImproveDepr":        li_depr,
            "totalDepreciation":      total_depr,
            "cumulativeDepreciation": cumulative_depr,
            "remainingBuildingBasis": round(max(remaining_basis, 0.0), 2),
        })

    return schedule


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Summary analytics and cost segregation comparison
# ─────────────────────────────────────────────────────────────────────────────

def build_summary(
    args:     argparse.Namespace,
    basis:    dict,
    schedule: list[dict],
) -> dict:
    """Computes projection-period summary metrics for UI display."""
    if not schedule:
        return {}

    total_depr   = schedule[-1]["cumulativeDepreciation"]
    avg_annual   = round(total_depr / len(schedule), 2)
    remaining    = schedule[-1]["remainingBuildingBasis"]
    month_name   = MONTH_NAMES[args.month_in_service]

    recovery_label_map = {
        "res27_5": "27.5-Year Residential Rental (MACRS Straight-Line)",
        "comm39":  "39-Year Commercial Non-Residential (MACRS Straight-Line)",
    }

    if args.property_class == "res27_5":
        months_in_yr1 = 12 - args.month_in_service + 0.5
        mid_month_note = (
            f"{month_name} — {months_in_yr1:.1f} months of depreciation in Year 1 "
            f"(mid-month convention: treated as placed in service {month_name} 15)"
        )
        max_recovery = 29
    else:
        months_in_yr1 = 12 - args.month_in_service + 0.5
        mid_month_note = (
            f"{month_name} — {months_in_yr1:.1f} months in Year 1 "
            f"(mid-month convention)"
        )
        max_recovery = 40

    return {
        "macrsClassification":       recovery_label_map[args.property_class],
        "fullRecoveryPeriodYears":   27.5 if args.property_class == "res27_5" else 39.0,
        "totalRecoveryYears":        max_recovery,
        "midMonthFactor":            mid_month_note,
        "totalProjectionYears":      len(schedule),
        "cumulativeDepreciation":    total_depr,
        "averageAnnualDepreciation": avg_annual,
        "remainingDepreciableBasis": remaining,
        # Tax savings estimates at common marginal rates
        "projectedTaxSavingsAt37pct": round(total_depr * 0.37, 2),
        "projectedTaxSavingsAt32pct": round(total_depr * 0.32, 2),
        "projectedTaxSavingsAt24pct": round(total_depr * 0.24, 2),
    }


def build_cost_segregation_analysis(
    basis:    dict,
    schedule: list[dict],
) -> dict:
    """
    Compares Year 1 total depreciation (with cost segregation) against what
    the building-only straight-line figure would have been, to quantify the
    accelerated deduction benefit generated by reclassifying personal property
    and land improvements into shorter recovery periods.
    """
    if not schedule:
        return {}

    year1 = schedule[0]
    baseline_yr1     = year1["buildingDepreciation"]    # building SL only
    accelerated_yr1  = year1["totalDepreciation"]       # all components
    gain_yr1         = round(accelerated_yr1 - baseline_yr1, 2)
    gain_pct         = round(
        (gain_yr1 / baseline_yr1 * 100) if baseline_yr1 > 0 else 0.0, 2
    )

    # Total cost segregation component basis
    seg_total_basis = round(
        basis["personalPropBasis"] + basis["landImproveBasis"], 2
    )

    return {
        "personalPropBasis":        basis["personalPropBasis"],
        "landImproveBasis":         basis["landImproveBasis"],
        "totalSegregatedBasis":     seg_total_basis,
        "baselineStraightLineYear1": baseline_yr1,
        "acceleratedYear1Total":    accelerated_yr1,
        "year1AcceleratedGain":     gain_yr1,
        "year1GainPct":             gain_pct,
        "year1GainNote": (
            f"Cost segregation increased Year 1 deduction by ${gain_yr1:,.2f} "
            f"({gain_pct:.1f}%) over baseline building straight-line depreciation alone."
            if gain_yr1 > 0 else
            "No cost segregation components allocated. "
            "Consider adding --personal-prop-basis and/or --land-improve-basis "
            "to maximize Year 1 accelerated deductions."
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: Assemble and emit output
# ─────────────────────────────────────────────────────────────────────────────

def assemble_output(
    args:                 argparse.Namespace,
    basis:                dict,
    schedule:             list[dict],
    summary:              dict,
    cost_seg_analysis:    dict,
) -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt":   datetime.now(timezone.utc).isoformat(),
        "assumptions": {
            "purchasePrice":       args.purchase_price,
            "capitalizedClosing":  args.capitalized_closing,
            "totalCostBasis":      basis["totalCostBasis"],
            "buildingPct":         args.building_pct,
            "landPct":             basis["landPct"],
            "propertyClass":       args.property_class,
            "monthInService":      args.month_in_service,
            "monthName":           MONTH_NAMES[args.month_in_service],
            "yearInService":       args.year_in_service,
            "projectionYears":     args.projection_years,
            "personalPropBasis":   args.personal_prop_basis,
            "landImproveBasis":    args.land_improve_basis,
        },
        "basisAnalysis":       basis,
        "schedule":            schedule,
        "summary":             summary,
        "costSegregation":     cost_seg_analysis,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()
    validate(args)

    # Step 1: Isolate depreciable basis
    basis = compute_basis(args)

    # Step 2-4: Generate depreciation schedule
    schedule = build_depreciation_schedule(args, basis)

    # Step 5: Build summary and cost segregation comparison
    summary          = build_summary(args, basis, schedule)
    cost_seg_analysis = build_cost_segregation_analysis(basis, schedule)

    # Assemble final output
    output   = assemble_output(args, basis, schedule, summary, cost_seg_analysis)
    json_str = json.dumps(output, indent=2)

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(json_str)
        except OSError as exc:
            print(
                json.dumps({"error": "IO_ERROR", "message": str(exc)}),
                file=sys.stderr,
            )
            sys.exit(3)
    else:
        print(json_str)


if __name__ == "__main__":
    main()
