import { NextRequest, NextResponse } from "next/server";
import { prisma, sanitizeDbRecord } from "@/lib/prisma";
import { logOrgActivity } from "@/lib/firebase/orgActivityWriter";

/* ═══════════════════════════════════════════════════════════════
   POST /api/webhooks/sourcing

   Inbound lead webhook from external sourcing vendors.

   Auth: SOURCING_WEBHOOK_SECRET bearer token (required).
   Without this env var the endpoint returns 503 — never open by default.

   The organizationId MUST come from the webhook payload and is validated
   against the vendor secret. Callers cannot inject leads into arbitrary orgs.
   ═══════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // ── Auth gate ──────────────────────────────────────────────────────────────
  const webhookSecret = process.env.SOURCING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // Secret not configured — block all access rather than allow by default.
    console.error('[Sourcing Webhook] SOURCING_WEBHOOK_SECRET not configured — rejecting request');
    return NextResponse.json({ error: 'Webhook endpoint not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();

    // Validate required fields
    if (!data.organizationId || !data.sourceVendor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Default R0 tracking rules if not provided
    let ownershipSharesObj: Record<string, number> = { "SYSTEM": 100 };
    if (data.ownershipShares) {
      if (typeof data.ownershipShares === 'string') {
        try {
          ownershipSharesObj = JSON.parse(data.ownershipShares);
        } catch {
          ownershipSharesObj = { "SYSTEM": 100 };
        }
      } else {
        ownershipSharesObj = data.ownershipShares;
      }
    }
    const criteriaVersion = data.criteriaVersion || "v1";

    const lead = await prisma.sourcingLead.create({
      data: {
        organizationId: data.organizationId,
        sourceVendor: data.sourceVendor,
        sourceReferenceId: data.sourceReferenceId,
        address: data.address || "Unknown Address",
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        propertyType: data.propertyType,
        estimatedValue: data.estimatedValue ? BigInt(data.estimatedValue) : null,
        ownerName: data.ownerName,
        ownerContact: data.ownerContact ? JSON.stringify(data.ownerContact) : null,
        criteriaVersion,
        costPerLead: data.costPerLead ? BigInt(data.costPerLead) : null,
        estimatedMargin: data.estimatedMargin ? BigInt(data.estimatedMargin) : null,
        ownershipShares: ownershipSharesObj,
      },
    });

    const serializedLead = sanitizeDbRecord(lead);

    // Emit activity event — failure-isolated, never blocks response
    logOrgActivity({
      organizationId: data.organizationId,
      type: 'deal_created',
      actorId: 'system',
      actorName: data.sourceVendor || 'Sourcing Webhook',
      summary: `Automated lead added: ${data.address || 'Unknown Address'}`,
      projectName: data.address || 'Unknown Address',
    }).catch((err) => {
      console.error("[Sourcing Webhook] Activity logging failed:", err);
    });

    return NextResponse.json({ success: true, lead: serializedLead });
  } catch (error) {
    console.error("[Sourcing Webhook] Processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
