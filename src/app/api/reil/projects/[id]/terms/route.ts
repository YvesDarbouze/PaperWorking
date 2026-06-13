import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isAuthError } from "@/lib/firebase-admin/auth-guard";
import { getProject, upsertPurchaseTerms, getPurchaseTerms } from "@/lib/db/projects";
import { sanitizeDbRecord } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// ── Validation schema ────────────────────────────────────────────────────────

const termsSchema = z
  .object({
    offerMadeCents:      z.number().int().nonnegative().nullable().optional(),
    offerDate:           z.string().nullable().optional(),
    sellerResponse:      z.enum(["PENDING", "ACCEPTED", "COUNTERED", "REJECTED"]).optional(),
    counterPriceCents:   z.number().int().nonnegative().nullable().optional(),
    acceptedPriceCents:  z.number().int().nonnegative().nullable().optional(),
    earnestMoneyCents:   z.number().int().nonnegative().nullable().optional(),
    estClosingCostsCents: z.number().int().nonnegative().nullable().optional(),
    amountPaidCents:     z.number().int().nonnegative().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sellerResponse === "COUNTERED" && !data.counterPriceCents) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Counter price is required when seller has countered.",
        path:    ["counterPriceCents"],
      });
    }
  });

// GET /api/reil/projects/:id/terms
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  
  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const terms = await getPurchaseTerms(id);
  return NextResponse.json(sanitizeDbRecord(terms));
}

// POST /api/reil/projects/:id/terms — upsert purchase terms
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { id } = await params;

  const { hasProjectAccess } = await import("@/lib/auth/scopeGuard");
  if (!(await hasProjectAccess(auth.uid, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = termsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const d = parsed.data;
  const saved = await upsertPurchaseTerms({
    projectId:           id,
    offerMadeCents:      d.offerMadeCents      != null ? BigInt(d.offerMadeCents)      : null,
    offerDate:           d.offerDate            ? new Date(d.offerDate)                : null,
    sellerResponse:      d.sellerResponse,
    counterPriceCents:   d.counterPriceCents   != null ? BigInt(d.counterPriceCents)   : null,
    acceptedPriceCents:  d.acceptedPriceCents  != null ? BigInt(d.acceptedPriceCents)  : null,
    earnestMoneyCents:   d.earnestMoneyCents   != null ? BigInt(d.earnestMoneyCents)   : null,
    estClosingCostsCents: d.estClosingCostsCents != null ? BigInt(d.estClosingCostsCents) : null,
    amountPaidCents:     d.amountPaidCents     != null ? BigInt(d.amountPaidCents)     : null,
  });

  return NextResponse.json(sanitizeDbRecord(saved));
}
