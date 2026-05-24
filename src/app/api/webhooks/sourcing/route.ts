import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Validate integration & R0 constraints
    if (!data.organizationId || !data.sourceVendor) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Default R0 tracking rules if not provided
    const ownershipShares = data.ownershipShares || JSON.stringify({ "SYSTEM": 100 });
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
        ownershipShares,
      },
    });

    // BigInt can't be JSON serialized directly without replacer
    const serializedLead = JSON.parse(JSON.stringify(lead, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json({ success: true, lead: serializedLead });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
