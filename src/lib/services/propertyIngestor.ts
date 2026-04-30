/**
 * src/lib/services/propertyIngestor.ts
 *
 * Responsible for writing a batch of raw BridgeRecord objects into Postgres
 * via Prisma. Extracted from ReplicationWorker so it can be unit-tested
 * independently of the HTTP fetch / watermark logic.
 *
 * Single responsibility: raw records → validated → chunked upserts → DB.
 */

import prisma from '../prisma';
import { BridgeFeedHandler, BridgeRecord } from '../utils/BridgeFeedHandler';

export const INGEST_CHUNK_SIZE = 100;

/**
 * Converts a raw Bridge record into the Prisma-ready shape.
 * Pure function — no I/O, easy to test.
 */
export function mapRecordToFields(originalRecord: BridgeRecord) {
  const record = BridgeFeedHandler.sanitize(originalRecord);

  return {
    listingId: record.ListingId as string,
    standardStatus: record.StandardStatus as string,
    // listPrice is stored as cents (BigInt). Number() would lose precision above
    // ~$90 trillion (IEEE 754 limit), so we round to the nearest cent explicitly.
    listPrice: record.ListPrice
      ? BigInt(Math.round(Number(record.ListPrice) * 100))
      : BigInt(0),
    unparsedAddress: record.UnparsedAddress as string,
    bedroomsTotal: record.BedroomsTotal ? Number(record.BedroomsTotal) : null,
    bathroomsFull: record.BathroomsFull ? Number(record.BathroomsFull) : null,
    bathroomsHalf: record.BathroomsHalf ? Number(record.BathroomsHalf) : null,
    livingArea: record.LivingArea ? Number(record.LivingArea) : null,
    lotSizeAcres: record.LotSizeAcres ? Number(record.LotSizeAcres) : null,
    yearBuilt: record.YearBuilt ? Number(record.YearBuilt) : null,
    publicRemarks: record.PublicRemarks as string,
    media: record.Media ? JSON.stringify(record.Media) : null,
    bridgeModificationTimestamp: new Date(record.BridgeModificationTimestamp as string),
    coordinates: record.Coordinates as string,
    feedTypes: JSON.stringify(record.FeedTypes || []),
  };
}

/**
 * Upserts a flat list of BridgeRecords in chunks of INGEST_CHUNK_SIZE.
 * Each chunk runs inside its own Prisma transaction to keep connection-pool
 * pressure bounded regardless of how large the incoming batch is.
 *
 * Returns the number of records written.
 */
export async function ingestRecords(records: BridgeRecord[]): Promise<number> {
  let written = 0;

  for (let i = 0; i < records.length; i += INGEST_CHUNK_SIZE) {
    const chunk = records.slice(i, i + INGEST_CHUNK_SIZE);

    await prisma.$transaction(
      chunk.map((raw) => {
        const fields = mapRecordToFields(raw);
        return prisma.property.upsert({
          where: { listingKey: raw.ListingKey as string },
          update: fields,
          create: { listingKey: raw.ListingKey as string, ...fields },
        });
      })
    );

    written += chunk.length;
  }

  return written;
}
