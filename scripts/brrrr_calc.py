#!/usr/bin/env python3
"""
brrrr_calc.py — PaperWorking BRRRR Double-Constraint Underwriting Engine
=========================================================================
Models the full Buy, Rehab, Rent, Refinance, Repeat transaction lifecycle
across two mathematically distinct phases:

  Phase 1 (Unstabilized): Simple-interest bridge debt + carrying costs
                           tracked to derive total capital deployed (totalCashIn)

  Phase 2 (Stabilized):   Double-constraint refinance — maximum loan is the
                           LOWER of the LTV cap and the DSCR cap.

                           Max Refi Loan = min(ARV × LTV_refi,
                                               NOI_stabilized / (DSCR_target
                                                                  × LoanConstant))

Outputs a single JSON document with Phase 1 summary, refinance analysis,
capital recycling metrics, and DSCR verification.

Usage:
    python3 scripts/brrrr_calc.py \\
        --purchase-price 220000 --rehab-cost 45000 \\
        --bridge-loan 198000 --bridge-rate 11.5 \\
        --hold-months 6 --down-payment 55000 \\
        --arv 320000 --stabilized-noi 21600 \\
        --refi-rate 7.0 --bridge-payoff 198000

Exit codes:
    0 — Success, valid JSON on stdout
    1 — Validation error (missing or invalid input)
    2 — DSCR constraint violation (actual DSCR < target after underwriting)
    3 — I/O error
"""

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from typing import Optional


SCHEMA_VERSION = "1.0.0"


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: Argument parsing and validation
# ─────────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="PaperWorking BRRRR Double-Constraint Underwriting Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # ── Phase 1: Acquisition and holding ─────────────────────────────────────
    p.add_argument("--purchase-price",    type=float, required=True,
                   help="Property purchase price in dollars")
    p.add_argument("--rehab-cost",        type=float, required=True,
                   help="Total renovation / rehab cost in dollars")
    p.add_argument("--acq-closing-costs", type=float, default=0.0,
                   help="Buyer acquisition closing costs in dollars")
    p.add_argument("--bridge-loan",       type=float, required=True,
                   help="Bridge / hard money loan amount in dollars")
    p.add_argument("--bridge-rate",       type=float, required=True,
                   help="Bridge loan annual interest rate as a percentage (e.g. 11.5)")
    p.add_argument("--hold-months",       type=int,   required=True,
                   help="Hold period from purchase to stabilization in months")
    p.add_argument("--down-payment",      type=float, required=True,
                   help="Initial equity down payment in dollars")
    p.add_argument("--monthly-taxes",     type=float, default=0.0,
                   help="Monthly property tax holding cost in dollars")
    p.add_argument("--monthly-insurance", type=float, default=0.0,
                   help="Monthly insurance holding cost in dollars")
    p.add_argument("--monthly-utilities", type=float, default=0.0,
                   help="Monthly utilities holding cost in dollars")
    p.add_argument("--monthly-misc",      type=float, default=0.0,
                   help="Monthly miscellaneous holding costs in dollars")

    # ── Phase 2: Stabilized refinancing ──────────────────────────────────────
    p.add_argument("--arv",               type=float, required=True,
                   help="After-Repair Value post-renovation in dollars")
    p.add_argument("--refi-ltv",          type=float, default=75.0,
                   help="Refinance LTV cap as a percentage (e.g. 75 for 75%%)")
    p.add_argument("--stabilized-noi",    type=float, required=True,
                   help="Annual stabilized Net Operating Income in dollars")
    p.add_argument("--dscr-target",       type=float, default=1.25,
                   help="Lender minimum DSCR (e.g. 1.25)")
    p.add_argument("--refi-rate",         type=float, required=True,
                   help="Refinance annual interest rate as a percentage (e.g. 7.0)")
    p.add_argument("--refi-term",         type=int,   default=30,
                   choices=[10, 15, 20, 25, 30],
                   help="Refinance loan amortization term in years")
    p.add_argument("--refi-closing-costs",type=float, default=0.0,
                   help="Refinance closing costs in dollars")
    p.add_argument("--bridge-payoff",     type=float, required=True,
                   help="Bridge loan payoff balance at refinance in dollars")
    p.add_argument("--vacancy-rate",      type=float, default=7.0,
                   help="Vacancy rate for post-refi cash flow (0–40%%)")

    # ── Output ────────────────────────────────────────────────────────────────
    p.add_argument("--output",            type=str,   default=None,
                   help="Write JSON to this file path instead of stdout")

    return p.parse_args()


def validate(args: argparse.Namespace) -> None:
    errors = []

    if args.purchase_price <= 0:
        errors.append("--purchase-price must be > 0")
    if args.rehab_cost < 0:
        errors.append("--rehab-cost must be >= 0")
    if args.bridge_loan <= 0:
        errors.append("--bridge-loan must be > 0")
    if not (0 < args.bridge_rate <= 30):
        errors.append("--bridge-rate must be between 0 and 30")
    if args.hold_months < 1:
        errors.append("--hold-months must be >= 1")
    if args.down_payment < 0:
        errors.append("--down-payment must be >= 0")
    if args.arv <= 0:
        errors.append("--arv must be > 0")
    if args.arv <= args.purchase_price:
        errors.append("--arv should exceed --purchase-price for a BRRRR to make sense")
    if not (0 < args.refi_ltv <= 95):
        errors.append("--refi-ltv must be between 0 and 95")
    if args.stabilized_noi <= 0:
        errors.append("--stabilized-noi must be > 0")
    if args.dscr_target < 1.0:
        errors.append("--dscr-target must be >= 1.0 (coverage ratio cannot be below 1.0)")
    if not (0 < args.refi_rate <= 20):
        errors.append("--refi-rate must be between 0 and 20")
    if args.bridge_payoff < 0:
        errors.append("--bridge-payoff must be >= 0")
    if not (0 <= args.vacancy_rate <= 40):
        errors.append("--vacancy-rate must be between 0 and 40")

    if errors:
        payload = {
            "error":    "MISSING_REQUIRED_INPUT",
            "field":    "multiple",
            "messages": errors,
        }
        print(json.dumps(payload, indent=2), file=sys.stderr)
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Phase 1 — Unstabilized carrying cost model
# ─────────────────────────────────────────────────────────────────────────────

def compute_phase1(args: argparse.Namespace) -> dict:
    """
    Models the capital deployed during the acquisition and rehabilitation period.

    Bridge debt is interest-only (simple interest — no amortization).
    All carrying costs are tracked monthly and summed for the full hold period.

    totalCashIn = downPayment + acqClosingCosts + rehabCost
                  + totalInterestCarry + totalOperatingHoldCosts
    """
    monthly_bridge_rate    = args.bridge_rate / 100.0 / 12.0
    monthly_bridge_interest = round(args.bridge_loan * monthly_bridge_rate, 2)
    total_interest_carry   = round(monthly_bridge_interest * args.hold_months, 2)

    monthly_ops = round(
        args.monthly_taxes + args.monthly_insurance
        + args.monthly_utilities + args.monthly_misc, 2
    )
    total_ops = round(monthly_ops * args.hold_months, 2)

    total_holding_costs = round(total_interest_carry + total_ops, 2)

    total_cash_in = round(
        args.down_payment + args.acq_closing_costs
        + args.rehab_cost + total_holding_costs, 2
    )

    # Implied entry LTV: bridge loan relative to purchase price
    entry_ltv = round((args.bridge_loan / args.purchase_price) * 100, 2) \
        if args.purchase_price > 0 else 0.0

    return {
        "purchasePrice":             args.purchase_price,
        "downPayment":               args.down_payment,
        "acqClosingCosts":           args.acq_closing_costs,
        "rehabCost":                 args.rehab_cost,
        "bridgeLoan":                args.bridge_loan,
        "bridgeRatePct":             args.bridge_rate,
        "holdMonths":                args.hold_months,
        "monthlyBridgeInterest":     monthly_bridge_interest,
        "totalInterestCarry":        total_interest_carry,
        "monthlyOperatingHoldCosts": monthly_ops,
        "totalOperatingHoldCosts":   total_ops,
        "totalHoldingCosts":         total_holding_costs,
        "totalCashIn":               total_cash_in,
        "entryLTV":                  entry_ltv,
        "breakdown": {
            "downPayment":           args.down_payment,
            "acqClosingCosts":       args.acq_closing_costs,
            "rehabCost":             args.rehab_cost,
            "interestCarry":         total_interest_carry,
            "operatingHoldCosts":    total_ops,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Loan constant computation
# ─────────────────────────────────────────────────────────────────────────────

def compute_loan_constant(annual_rate_pct: float, term_years: int) -> float:
    """
    Loan constant (k) = annual debt service per dollar of loan balance.

    Derived from the standard amortizing payment formula:
        monthlyPayment_per_$1 = r × (1+r)^N / ((1+r)^N - 1)
        k = monthlyPayment_per_$1 × 12

    At r = 7.0%, 30-year term: k ≈ 0.07986 (i.e., ~$7,986 DS per $100k loan)
    """
    r = annual_rate_pct / 100.0 / 12.0
    n = term_years * 12

    if r == 0:
        return round(1.0 / n * 12, 6)

    power                   = math.pow(1 + r, n)
    monthly_per_dollar      = r * power / (power - 1)
    loan_constant           = monthly_per_dollar * 12

    return round(loan_constant, 6)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Phase 2 — Double-constraint refinance algorithm
# ─────────────────────────────────────────────────────────────────────────────

def compute_refinance(args: argparse.Namespace) -> dict:
    """
    Double-constraint refinance formula:

        Max Refi Loan = min(
            ARV × LTV_refi,
            NOI_stabilized / (DSCR_target × LoanConstant_refi)
        )

    Both constraints are computed independently. The binding constraint is
    the one that produces the lower loan amount. The binding constraint
    determines how much equity can be recycled.
    """
    loan_constant = compute_loan_constant(args.refi_rate, args.refi_term)

    # ── Constraint 1: LTV cap ─────────────────────────────────────────────────
    constraint_ltv = round(args.arv * (args.refi_ltv / 100.0), 2)

    # ── Constraint 2: DSCR cap ────────────────────────────────────────────────
    # The lender will not extend a loan whose required debt service would push
    # the DSCR below the target. Rearranging DSCR = NOI / DS:
    #   DS_max    = NOI / DSCR_target
    #   Loan_max  = DS_max / LoanConstant
    constraint_dscr = round(
        args.stabilized_noi / (args.dscr_target * loan_constant), 2
    )

    max_refi_loan     = min(constraint_ltv, constraint_dscr)
    binding_constraint = "LTV" if constraint_ltv <= constraint_dscr else "DSCR"

    binding_note = (
        "Appraisal value limits the loan. The property income would support a "
        f"larger loan (${constraint_dscr:,.2f}), but the lender's LTV cap of "
        f"{args.refi_ltv:.1f}% of ARV (${args.arv:,.2f}) is the binding constraint."
    ) if binding_constraint == "LTV" else (
        "Rental income is the limiting factor. The property value would support a "
        f"larger loan (${constraint_ltv:,.2f}), but stabilized NOI of "
        f"${args.stabilized_noi:,.2f} cannot cover the required DSCR of "
        f"{args.dscr_target:.2f}× on a higher loan amount."
    )

    return {
        "refiRatePct":        args.refi_rate,
        "refiTermYears":      args.refi_term,
        "loanConstant":       loan_constant,
        "constraint_LTV":     constraint_ltv,
        "constraint_DSCR":    constraint_dscr,
        "maxRefiLoan":        round(max_refi_loan, 2),
        "bindingConstraint":  binding_constraint,
        "bindingNote":        binding_note,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Capital recycling and post-refinance returns
# ─────────────────────────────────────────────────────────────────────────────

def compute_recycling(
    args: argparse.Namespace,
    phase1: dict,
    refinance: dict,
) -> dict:
    """
    Capital recycling metrics and post-refinance cash-on-cash return.

    cashRecoveredAtRefi = maxRefiLoan - refiClosingCosts - bridgePayoff
    cashLeftInDeal      = totalCashIn - cashRecoveredAtRefi

    Post-refi CoC:
        If cashLeftInDeal <= 0: infinite (full capital recycling achieved)
        Else: annualCashFlow_postRefi / cashLeftInDeal × 100
    """
    max_refi_loan         = refinance["maxRefiLoan"]
    loan_constant         = refinance["loanConstant"]
    total_cash_in         = phase1["totalCashIn"]
    vacancy_rate          = args.vacancy_rate / 100.0

    # Net cash returned after retiring bridge debt and paying refi costs
    cash_recovered        = round(
        max_refi_loan - args.refi_closing_costs - args.bridge_payoff, 2
    )
    cash_left_in_deal     = round(total_cash_in - cash_recovered, 2)

    # Recycle percentage
    recycle_pct           = round((cash_recovered / total_cash_in) * 100, 2) \
        if total_cash_in > 0 else 0.0

    # Post-refinance annual debt service on the new permanent loan
    annual_ds_refi        = round(max_refi_loan * loan_constant, 2)

    # Post-refinance annual cash flow (vacancy-adjusted)
    annual_cf_post_refi   = round(
        (args.stabilized_noi - annual_ds_refi) * (1 - vacancy_rate), 2
    )

    # Cash-on-Cash return on residual trapped equity
    if cash_left_in_deal <= 0:
        coc_post_refi     = None       # mathematically infinite
        coc_label         = "∞ (Full Capital Recycling Achieved)"
        recycle_status    = "Full Capital Recycle"
    elif recycle_pct >= 80.0:
        coc_post_refi     = round((annual_cf_post_refi / cash_left_in_deal) * 100, 2) \
            if cash_left_in_deal > 0 else None
        coc_label         = f"{coc_post_refi:.2f}%" if coc_post_refi is not None else "—"
        recycle_status    = "Near-Full Recycle (≥80% Recovered)"
    else:
        coc_post_refi     = round((annual_cf_post_refi / cash_left_in_deal) * 100, 2) \
            if cash_left_in_deal > 0 else None
        coc_label         = f"{coc_post_refi:.2f}%" if coc_post_refi is not None else "—"
        recycle_status    = "Partial Recycle"

    return {
        "cashRecoveredAtRefi":        cash_recovered,
        "cashLeftInDeal":             cash_left_in_deal,
        "recyclePct":                 recycle_pct,
        "recycleStatus":              recycle_status,
        "annualDebtService_refi":     annual_ds_refi,
        "annualCashFlow_postRefi":    annual_cf_post_refi,
        "cocPostRefi":                coc_post_refi,
        "cocLabel":                   coc_label,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: DSCR and LTV verification
# ─────────────────────────────────────────────────────────────────────────────

def compute_verification(
    args: argparse.Namespace,
    refinance: dict,
) -> dict:
    """
    Verifies that the underwritten loan satisfies the lender's DSCR requirement
    and reports entry/exit LTV for portfolio reporting.

    actualDSCR = stabilizedNOI / annualDebtService_refi
    """
    loan_constant       = refinance["loanConstant"]
    max_refi_loan       = refinance["maxRefiLoan"]
    annual_ds_refi      = round(max_refi_loan * loan_constant, 2)

    actual_dscr         = round(
        args.stabilized_noi / annual_ds_refi, 4
    ) if annual_ds_refi > 0 else None

    dscr_compliant      = (actual_dscr is not None) and (actual_dscr >= args.dscr_target)

    # Entry LTV: bridge loan relative to purchase price
    entry_ltv           = round(
        (args.bridge_loan / args.purchase_price) * 100, 2
    ) if args.purchase_price > 0 else None

    # Exit LTV: permanent loan relative to ARV after refinance
    exit_ltv            = round(
        (max_refi_loan / args.arv) * 100, 2
    ) if args.arv > 0 else None

    return {
        "stabilizedNOI":     args.stabilized_noi,
        "annualDebtService": annual_ds_refi,
        "actualDSCR":        actual_dscr,
        "dscrTarget":        args.dscr_target,
        "dscrCompliant":     dscr_compliant,
        "entryLTV":          entry_ltv,
        "exitLTV":           exit_ltv,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: Assemble output and emit JSON
# ─────────────────────────────────────────────────────────────────────────────

def assemble_output(
    args:         argparse.Namespace,
    phase1:       dict,
    refinance:    dict,
    recycling:    dict,
    verification: dict,
) -> dict:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt":   datetime.now(timezone.utc).isoformat(),
        "assumptions": {
            "purchasePrice":    args.purchase_price,
            "rehabCost":        args.rehab_cost,
            "acqClosingCosts":  args.acq_closing_costs,
            "bridgeLoan":       args.bridge_loan,
            "bridgeRatePct":    args.bridge_rate,
            "holdMonths":       args.hold_months,
            "downPayment":      args.down_payment,
            "arv":              args.arv,
            "refiLtvPct":       args.refi_ltv,
            "stabilizedNOI":    args.stabilized_noi,
            "dscrTarget":       args.dscr_target,
            "refiRatePct":      args.refi_rate,
            "refiTermYears":    args.refi_term,
            "refiClosingCosts": args.refi_closing_costs,
            "bridgePayoff":     args.bridge_payoff,
            "vacancyRatePct":   args.vacancy_rate,
        },
        "phase1":       phase1,
        "refinance":    refinance,
        "recycling":    recycling,
        "verification": verification,
    }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> None:
    args = parse_args()
    validate(args)

    # Phase 1: unstabilized carrying costs
    phase1 = compute_phase1(args)

    # Phase 2: double-constraint refinance
    refinance = compute_refinance(args)

    # Capital recycling and post-refi CoC
    recycling = compute_recycling(args, phase1, refinance)

    # DSCR and LTV verification
    verification = compute_verification(args, refinance)

    # Assemble output
    output   = assemble_output(args, phase1, refinance, recycling, verification)
    json_str = json.dumps(output, indent=2)

    # DSCR violation warning — exit code 2 but still emit full JSON to stdout
    if not verification["dscrCompliant"]:
        warning = {
            "warning":  "DSCR_VIOLATION",
            "message":  (
                f"Actual DSCR ({verification['actualDSCR']}) is below "
                f"lender target ({args.dscr_target}). This should not occur "
                "if the double-constraint formula was applied correctly. "
                "Check for rounding discrepancy or input data error."
            ),
            "analysis": output,
        }
        print(json.dumps(warning, indent=2))
        sys.exit(2)

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
