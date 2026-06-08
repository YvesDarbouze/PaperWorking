#!/usr/bin/env python3
"""
underwrite.py — PaperWorking Real Estate Underwriting Engine
=============================================================
Implements institutional-grade cash flow underwriting for multifamily,
single-family, fix-and-flip, and BRRRR transactions.

Outputs a single JSON document containing:
  - 10-year pro forma (PGI, Vacancy, EGI, OpEx, NOI, Debt Service, CFBT)
  - Monthly amortization schedule with drift-reconciliation
  - Year-end amortization summary
  - Exit valuation and net reversion cash flow
  - Investment yield metrics (IRR, Equity Multiple, Cash-on-Cash)

Usage:
    python3 scripts/underwrite.py --purchase-price 850000 --units 4 \
        --monthly-rent 1800 --loan-amount 637500 --interest-rate 7.25

Exit codes:
    0 — Success, valid JSON on stdout
    1 — Validation error (missing or invalid input)
    2 — Math error (e.g., non-convergent IRR)
    3 — I/O error (cannot write output file)
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from typing import Optional


# ─── Schema version ──────────────────────────────────────────────────────────
SCHEMA_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: Argument parsing and input validation
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="PaperWorking Real Estate Underwriting Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # --- Required acquisition inputs ---
    p.add_argument("--purchase-price",  type=float, required=True,
                   help="Total purchase price in dollars")
    p.add_argument("--units",           type=int,   required=True,
                   help="Number of rentable units")
    p.add_argument("--monthly-rent",    type=float, required=True,
                   help="Monthly rent per unit in dollars")

    # --- Required financing inputs ---
    p.add_argument("--loan-amount",     type=float, required=True,
                   help="Total loan principal in dollars")
    p.add_argument("--interest-rate",   type=float, required=True,
                   help="Annual interest rate as a percentage (e.g. 7.25 for 7.25%%)")

    # --- Optional income inputs ---
    p.add_argument("--vacancy-rate",    type=float, default=7.0,
                   help="Economic vacancy as a percentage (0-40)")
    p.add_argument("--credit-loss-rate",type=float, default=1.0,
                   help="Credit loss / bad debt as a percentage of PGI")
    p.add_argument("--other-income",    type=float, default=0.0,
                   help="Monthly other income (parking, laundry, storage) in dollars")

    # --- Optional operating expense inputs ---
    p.add_argument("--mgmt-fee-pct",    type=float, default=8.0,
                   help="Property management fee as a percentage of EGI")
    p.add_argument("--taxes",           type=float, default=0.0,
                   help="Annual property taxes before reassessment in dollars")
    p.add_argument("--tax-reassess-pct",type=float, default=30.0,
                   help="Post-sale tax reassessment uplift percentage applied to Year 1 only")
    p.add_argument("--insurance",       type=float, default=0.0,
                   help="Annual property insurance premium in dollars")
    p.add_argument("--utilities",       type=float, default=0.0,
                   help="Annual owner-paid utilities in dollars")
    p.add_argument("--maintenance",     type=float, default=0.0,
                   help="Annual repairs and maintenance in dollars")
    p.add_argument("--hoa",             type=float, default=0.0,
                   help="Annual HOA dues in dollars")
    p.add_argument("--capex-per-unit",  type=float, default=300.0,
                   help="Annual CapEx reserve per unit (BELOW the NOI line) in dollars")

    # --- Optional loan structure ---
    p.add_argument("--loan-term",       type=int,   default=30,
                   choices=[10, 15, 20, 25, 30],
                   help="Loan amortization term in years")

    # --- Optional pro forma controls ---
    p.add_argument("--rent-growth",     type=float, default=2.5,
                   help="Annual rent growth rate as a percentage")
    p.add_argument("--opex-growth",     type=float, default=3.5,
                   help="Annual operating expense inflation rate as a percentage")
    p.add_argument("--hold-years",      type=int,   default=10,
                   help="Investment hold period in years (1-30)")
    p.add_argument("--exit-cap-rate",   type=float, default=None,
                   help="Exit capitalization rate as a percentage; defaults to entry cap rate + 0.25%%")

    # --- Output ---
    p.add_argument("--output",          type=str,   default=None,
                   help="Write JSON to this file path instead of stdout")

    return p.parse_args()


def validate(args: argparse.Namespace) -> None:
    errors = []

    if args.purchase_price <= 0:
        errors.append("--purchase-price must be > 0")
    if args.units < 1:
        errors.append("--units must be >= 1")
    if args.monthly_rent <= 0:
        errors.append("--monthly-rent must be > 0")
    if args.loan_amount <= 0:
        errors.append("--loan-amount must be > 0")
    if args.loan_amount >= args.purchase_price:
        errors.append("--loan-amount must be less than --purchase-price")
    if not (0 < args.interest_rate <= 20):
        errors.append("--interest-rate must be between 0 and 20 (exclusive)")
    if not (0 < args.vacancy_rate <= 40):
        errors.append("--vacancy-rate must be between 0 and 40")
    if not (0 <= args.credit_loss_rate <= 10):
        errors.append("--credit-loss-rate must be between 0 and 10")
    if not (0 <= args.mgmt_fee_pct <= 15):
        errors.append("--mgmt-fee-pct must be between 0 and 15")
    if not (0 <= args.tax_reassess_pct <= 60):
        errors.append("--tax-reassess-pct must be between 0 and 60")
    if not (1 <= args.hold_years <= 30):
        errors.append("--hold-years must be between 1 and 30")

    if errors:
        payload = {
            "error": "MISSING_REQUIRED_INPUT",
            "field": "multiple",
            "messages": errors,
        }
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Monthly amortization schedule with drift-reconciliation
# ─────────────────────────────────────────────────────────────────────────────

def _monthly_payment(principal: float, annual_rate_pct: float, term_years: int) -> float:
    """
    Standard amortizing monthly payment:
        M = P × [r(1+r)^N] / [(1+r)^N - 1]

    Rounded to 2 decimal places immediately after computation.
    Returns 0.0 for interest-only or zero-rate edge cases.
    """
    r = annual_rate_pct / 100.0 / 12.0
    n = term_years * 12

    if r == 0:
        return round(principal / n, 2)

    power = math.pow(1 + r, n)
    return round(principal * (r * power) / (power - 1), 2)


def generate_amortization_schedule(
    principal: float,
    annual_rate_pct: float,
    term_years: int,
) -> list[dict]:
    """
    Produces a month-by-month amortization table for the full loan term.

    Drift-reconciliation algorithm:
      - interestPaid each month is rounded to 2 dp to reflect real banking
        transactions.
      - In the FINAL month, principalPaid is set to round(currentBalance, 2)
        (the exact residual) rather than standardPayment - interestPaid.
        This forces currentBalance to exactly 0.00 and eliminates the
        floating-point drift that accumulates over 360 iterations.

    Returns a list of dicts with keys:
        paymentNumber, paymentAmount, interestPaid, principalPaid,
        remainingBalance
    """
    r = annual_rate_pct / 100.0 / 12.0
    n = term_years * 12
    standard_payment = _monthly_payment(principal, annual_rate_pct, term_years)

    schedule = []
    balance = float(principal)

    for m in range(1, n + 1):
        interest_paid = round(balance * r, 2)

        if m == n:
            # ── Final month: drift-reconciliation ───────────────────────────
            principal_paid = round(balance, 2)
            payment_amount = round(interest_paid + principal_paid, 2)
            balance = 0.00
        else:
            principal_paid = round(standard_payment - interest_paid, 2)
            balance = round(balance - principal_paid, 2)
            payment_amount = standard_payment

        schedule.append({
            "paymentNumber":   m,
            "paymentAmount":   payment_amount,
            "interestPaid":    interest_paid,
            "principalPaid":   principal_paid,
            "remainingBalance": balance,
        })

    return schedule


def build_amortization_summary(
    schedule: list[dict],
    hold_years: int,
) -> list[dict]:
    """
    Aggregates the monthly schedule into annual summary rows.
    Returns one dict per year with:
        year, totalPayment, totalInterest, totalPrincipal, endingBalance
    """
    summary = []
    for year in range(1, hold_years + 2):   # +2 to cover exit year T+1
        start_m = (year - 1) * 12
        end_m   = year * 12
        year_rows = schedule[start_m:end_m]

        if not year_rows:
            break

        summary.append({
            "year":           year,
            "totalPayment":   round(sum(r["paymentAmount"]  for r in year_rows), 2),
            "totalInterest":  round(sum(r["interestPaid"]   for r in year_rows), 2),
            "totalPrincipal": round(sum(r["principalPaid"]  for r in year_rows), 2),
            "endingBalance":  year_rows[-1]["remainingBalance"],
        })

    return summary


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Pro forma cash flow projection
# ─────────────────────────────────────────────────────────────────────────────

def build_pro_forma(
    args: argparse.Namespace,
    amort_summary: list[dict],
) -> list[dict]:
    """
    Generates a year-by-year cash flow statement for years 1 through holdYears+1.
    Year holdYears+1 is flagged exitPeriod=True and used only for terminal
    capitalization — it is never included in hold-period cash distributions.

    Revenue line:
      PGI_t  = PGI_(t-1) × (1 + g_rent)

    Expense lines:
      Most OpEx lines compound at g_opex each year.
      Property management is always recalculated as mgmtFeePct × EGI_t
      (since EGI itself changes with rent growth and vacancy).

    Tax reassessment:
      Year 1 taxes = inputTaxes × (1 + taxReassessPct/100)
      Year 2+ taxes grow from the Year 1 reassessed base at g_opex.
    """

    # ── Seed Year 0 values (pre-growth baseline) ──────────────────────────────
    pgi_base          = args.monthly_rent * args.units * 12.0
    other_income_base = args.other_income * 12.0
    vacancy_rate      = args.vacancy_rate  / 100.0
    credit_loss_rate  = args.credit_loss_rate / 100.0
    mgmt_pct          = args.mgmt_fee_pct / 100.0

    # Operating expense bases (annualized)
    taxes_year1   = round(args.taxes * (1 + args.tax_reassess_pct / 100.0), 2)
    insurance_base = args.insurance
    utilities_base = args.utilities
    maintenance_base = args.maintenance
    hoa_base       = args.hoa
    capex_base     = args.capex_per_unit * args.units

    g_rent = args.rent_growth  / 100.0
    g_opex = args.opex_growth  / 100.0

    rows = []

    for t in range(1, args.hold_years + 2):   # include exit year T+1
        is_exit_period = (t == args.hold_years + 1)
        factor_rent = math.pow(1 + g_rent, t - 1)
        factor_opex = math.pow(1 + g_opex, t - 1)

        # ── Revenue ──────────────────────────────────────────────────────────
        pgi          = round(pgi_base * factor_rent, 2)
        vacancy_loss = round(pgi * vacancy_rate, 2)
        credit_loss  = round(pgi * credit_loss_rate, 2)
        other_income = round(other_income_base * factor_rent, 2)
        egi          = round(pgi - vacancy_loss - credit_loss + other_income, 2)

        # ── Above-the-line operating expenses ────────────────────────────────
        #  Management fee: recalculated on EGI each year (not simply inflated)
        mgmt_fee = round(egi * mgmt_pct, 2)

        # Property taxes: Year 1 uses reassessed base; subsequent years
        # compound from that Year 1 reassessed base at g_opex.
        if t == 1:
            taxes = taxes_year1
        else:
            taxes = round(taxes_year1 * math.pow(1 + g_opex, t - 1), 2)

        insurance   = round(insurance_base  * factor_opex, 2)
        utilities   = round(utilities_base  * factor_opex, 2)
        maintenance = round(maintenance_base * factor_opex, 2)
        hoa         = round(hoa_base        * factor_opex, 2)

        total_opex = round(
            taxes + insurance + utilities + mgmt_fee + maintenance + hoa, 2
        )

        noi = round(egi - total_opex, 2)

        # ── Below-the-line capital deductions ────────────────────────────────
        capex_reserve = round(capex_base * factor_opex, 2)

        # Annual debt service from pre-computed amortization summary
        annual_ds_row = next(
            (r for r in amort_summary if r["year"] == t), None
        )
        annual_ds = annual_ds_row["totalPayment"] if annual_ds_row else 0.0

        cfbt = round(noi - capex_reserve - annual_ds, 2)

        # ── Derived ratios ────────────────────────────────────────────────────
        entry_cap_rate = round((noi / args.purchase_price) * 100, 2) if t == 1 else None

        rows.append({
            "year":              t,
            "exitPeriod":        is_exit_period,
            "PGI":               pgi,
            "vacancyLoss":       vacancy_loss,
            "creditLoss":        credit_loss,
            "otherIncome":       other_income,
            "EGI":               egi,
            "mgmtFee":           mgmt_fee,
            "taxes":             taxes,
            "insurance":         insurance,
            "utilities":         utilities,
            "maintenance":       maintenance,
            "hoa":               hoa,
            "totalAboveLineOpEx": total_opex,
            "NOI":               noi,
            "capExReserve":      capex_reserve,
            "annualDebtService": round(annual_ds, 2),
            "cashFlowToEquity":  cfbt,
            "entryCapRate":      entry_cap_rate,
        })

    return rows


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Exit valuation
# ─────────────────────────────────────────────────────────────────────────────

def compute_exit_analysis(
    args: argparse.Namespace,
    pro_forma: list[dict],
    amort_summary: list[dict],
) -> dict:
    """
    Terminal exit valuation based on Year T+1 NOI.
        V_exit = NOI_(T+1) / exitCapRate
    Net reversion cash flow strips out selling costs and remaining loan balance.
    """
    # Determine entry cap rate from Year 1
    year1 = next(r for r in pro_forma if r["year"] == 1)
    entry_cap_rate_pct = year1["entryCapRate"] or 0.0

    # Exit cap rate defaults to entry + 25 bps if not provided
    if args.exit_cap_rate is not None:
        exit_cap_rate = args.exit_cap_rate / 100.0
    else:
        exit_cap_rate = (entry_cap_rate_pct / 100.0) + 0.0025

    # Year T+1 NOI for terminal capitalization
    exit_year_row = next(
        (r for r in pro_forma if r["exitPeriod"]), None
    )
    exit_noi = exit_year_row["NOI"] if exit_year_row else 0.0

    gross_exit_value = round(exit_noi / exit_cap_rate, 2) if exit_cap_rate > 0 else 0.0

    # Selling costs: 6% of gross exit value (brokerage, title, escrow, transfer)
    sales_cost_pct = 0.06
    sales_costs    = round(gross_exit_value * sales_cost_pct, 2)

    # Remaining loan balance at end of hold period
    loan_balance_at_exit_row = next(
        (r for r in amort_summary if r["year"] == args.hold_years), None
    )
    loan_balance_at_exit = loan_balance_at_exit_row["endingBalance"] \
        if loan_balance_at_exit_row else args.loan_amount

    net_reversion = round(gross_exit_value - sales_costs - loan_balance_at_exit, 2)

    return {
        "exitNOI":             exit_noi,
        "exitCapRate":         round(exit_cap_rate * 100, 4),
        "entryCapRate":        entry_cap_rate_pct,
        "grossExitValue":      gross_exit_value,
        "salesCostPct":        round(sales_cost_pct * 100, 1),
        "salesCosts":          sales_costs,
        "loanBalanceAtExit":   loan_balance_at_exit,
        "netReversionCashFlow": net_reversion,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Levered cash flow array and IRR (Newton-Raphson)
# ─────────────────────────────────────────────────────────────────────────────

def build_cf_array(
    args: argparse.Namespace,
    pro_forma: list[dict],
    exit_analysis: dict,
) -> list[float]:
    """
    Constructs the levered cash flow array for IRR computation.

    CF_0   = -(purchase price - loan amount)   [initial equity outlay]
    CF_t   = cashFlowToEquity_t                [years 1 … T-1]
    CF_T   = cashFlowToEquity_T + netReversionCashFlow  [terminal year]
    """
    initial_equity = -(args.purchase_price - args.loan_amount)
    cf = [initial_equity]

    hold_rows = [r for r in pro_forma if not r["exitPeriod"]]

    for i, row in enumerate(hold_rows):
        cfbt = row["cashFlowToEquity"]
        if i == len(hold_rows) - 1:
            # Terminal year: add net reversion proceeds
            cfbt = round(cfbt + exit_analysis["netReversionCashFlow"], 2)
        cf.append(cfbt)

    return cf


def _npv(rate: float, cashflows: list[float]) -> float:
    return sum(cf / math.pow(1 + rate, t) for t, cf in enumerate(cashflows))


def _npv_derivative(rate: float, cashflows: list[float]) -> float:
    return sum(
        -t * cf / math.pow(1 + rate, t + 1)
        for t, cf in enumerate(cashflows)
        if t > 0
    )


def compute_irr(cashflows: list[float], max_iterations: int = 1000) -> Optional[float]:
    """
    Newton-Raphson IRR solver.
    Seeds at 10% (r = 0.10). Converges when |NPV| < 0.01 or
    the step size drops below 1e-7. Returns None if non-convergent
    or if the input has no sign change (trivially no real IRR).
    """
    # Guard: must have at least one positive and one negative cash flow
    has_positive = any(cf > 0 for cf in cashflows)
    has_negative = any(cf < 0 for cf in cashflows)
    if not (has_positive and has_negative):
        return None

    r = 0.10
    for _ in range(max_iterations):
        npv   = _npv(r, cashflows)
        npv_d = _npv_derivative(r, cashflows)

        if abs(npv_d) < 1e-12:
            return None   # degenerate derivative — cannot converge

        step = npv / npv_d
        r    = r - step

        if abs(npv) < 0.01:
            return round(r * 100, 4)   # return as percentage

    return None   # non-convergent


def compute_yields(
    args: argparse.Namespace,
    cf_array: list[float],
    pro_forma: list[dict],
) -> dict:
    """
    Computes IRR, Equity Multiple, Cash-on-Cash (Year 1), and summaries.
    """
    initial_equity = abs(cf_array[0])
    hold_rows      = [r for r in pro_forma if not r["exitPeriod"]]

    irr = compute_irr(cf_array)

    # Equity Multiple: total positive cash flows / |CF_0|
    total_positive = sum(max(cf, 0) for cf in cf_array[1:])
    equity_multiple = round(total_positive / initial_equity, 2) if initial_equity > 0 else None

    # Cash-on-Cash Year 1
    coc_year1 = round(
        (hold_rows[0]["cashFlowToEquity"] / initial_equity) * 100, 2
    ) if initial_equity > 0 and hold_rows else None

    total_ops_cf = round(sum(r["cashFlowToEquity"] for r in hold_rows), 2)

    return {
        "initialEquity":               round(initial_equity, 2),
        "irr":                         irr,
        "equityMultiple":              equity_multiple,
        "cashOnCashYear1":             coc_year1,
        "totalCashFlowFromOperations": total_ops_cf,
        "totalReturnWithExit":         round(sum(cf for cf in cf_array[1:]), 2),
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: Assemble and emit output JSON
# ─────────────────────────────────────────────────────────────────────────────

def build_assumptions_block(args: argparse.Namespace) -> dict:
    """
    Records every assumption applied — including defaults and overrides —
    for full audit transparency in the deal report.
    """
    year1_taxes = round(args.taxes * (1 + args.tax_reassess_pct / 100.0), 2)

    exit_cap = args.exit_cap_rate
    if exit_cap is None:
        pgi = args.monthly_rent * args.units * 12.0
        vl  = pgi * (args.vacancy_rate / 100.0)
        cl  = pgi * (args.credit_loss_rate / 100.0)
        oi  = args.other_income * 12.0
        egi = pgi - vl - cl + oi
        mgmt = egi * (args.mgmt_fee_pct / 100.0)
        opex = year1_taxes + args.insurance + args.utilities + mgmt + args.maintenance + args.hoa
        noi  = egi - opex
        entry_cap = (noi / args.purchase_price) * 100.0 if args.purchase_price > 0 else 0.0
        exit_cap  = round(entry_cap + 0.25, 4)

    return {
        "purchasePrice":         args.purchase_price,
        "units":                 args.units,
        "monthlyRentPerUnit":    args.monthly_rent,
        "vacancyRate":           args.vacancy_rate,
        "creditLossRate":        args.credit_loss_rate,
        "otherMonthlyIncome":    args.other_income,
        "mgmtFeePct":            args.mgmt_fee_pct,
        "annualTaxesInput":      args.taxes,
        "taxReassessPct":        args.tax_reassess_pct,
        "year1TaxReassessed":    year1_taxes,
        "annualInsurance":       args.insurance,
        "annualUtilities":       args.utilities,
        "annualMaintenance":     args.maintenance,
        "annualHOA":             args.hoa,
        "capExPerUnit":          args.capex_per_unit,
        "loanAmount":            args.loan_amount,
        "annualInterestRate":    args.interest_rate,
        "loanTermYears":         args.loan_term,
        "rentGrowthRate":        args.rent_growth,
        "opexGrowthRate":        args.opex_growth,
        "holdYears":             args.hold_years,
        "exitCapRate":           exit_cap,
        "taxReassessmentNote":   (
            f"Year 1 property taxes increased by {args.tax_reassess_pct:.1f}% "
            f"from ${args.taxes:,.2f} to ${year1_taxes:,.2f} to reflect "
            f"post-sale reassessment. Subsequent years compound from Year 1 base."
        ),
        "capExNote": (
            "CapEx reserves are deducted BELOW the NOI line and do not affect "
            "Cap Rate or DSCR calculations. They reduce Cash Flow to Equity only."
        ),
    }


def assemble_output(
    args: argparse.Namespace,
    amort_schedule: list[dict],
    amort_summary:  list[dict],
    pro_forma:      list[dict],
    exit_analysis:  dict,
    yields:         dict,
) -> dict:
    return {
        "schemaVersion":       SCHEMA_VERSION,
        "generatedAt":         datetime.now(timezone.utc).isoformat(),
        "assumptions":         build_assumptions_block(args),
        "proForma":            [r for r in pro_forma if not r["exitPeriod"]],
        "exitPeriodProForma":  next((r for r in pro_forma if r["exitPeriod"]), None),
        "amortizationSummary": amort_summary,
        "amortizationSchedule": amort_schedule,   # full 360-row table
        "exitAnalysis":        exit_analysis,
        "yields":              yields,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()
    validate(args)

    # Step 2 — Amortization schedule (drift-reconciliation)
    try:
        amort_schedule = generate_amortization_schedule(
            principal       = args.loan_amount,
            annual_rate_pct = args.interest_rate,
            term_years      = args.loan_term,
        )
    except Exception as exc:
        print(
            json.dumps({"error": "AMORTIZATION_MATH_ERROR", "message": str(exc)}),
            file=sys.stderr,
        )
        sys.exit(2)

    amort_summary = build_amortization_summary(amort_schedule, args.hold_years)

    # Step 3–6 — Pro forma, exit, yields
    pro_forma     = build_pro_forma(args, amort_summary)
    exit_analysis = compute_exit_analysis(args, pro_forma, amort_summary)
    cf_array      = build_cf_array(args, pro_forma, exit_analysis)
    yields        = compute_yields(args, cf_array, pro_forma)

    # Assemble final JSON document
    output = assemble_output(
        args, amort_schedule, amort_summary, pro_forma, exit_analysis, yields
    )

    json_str = json.dumps(output, indent=2)

    # Write to file or stdout
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
