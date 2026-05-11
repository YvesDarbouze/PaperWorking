/**
 * src/lib/services/officeIngestor.ts
 *
 * Responsible for writing a batch of raw Bridge Office records into Postgres
 * via Prisma. Mirrors the propertyIngestor pattern for consistency.
 *
 * Single responsibility: raw Office records → validated → chunked upserts → DB.
 */

import prisma from '../prisma';
import type { BridgeOffice } from '../types/bridge';

export const INGEST_CHUNK_SIZE = 100;

/**
 * Converts a raw Bridge Office record into the Prisma-ready shape.
 * Pure function — no I/O, easy to test.
 */
export function mapOfficeToFields(raw: BridgeOffice) {
  return {
    officeMlsId: raw.OfficeMlsId ?? null,
    officeName: raw.OfficeName ?? null,
    officePhone: raw.OfficePhone ?? null,
    officeEmail: raw.OfficeEmail ?? null,
    officeAddress1: raw.OfficeAddress1 ?? null,
    officeCity: raw.OfficeCity ?? null,
    officeStateOrProvince: raw.OfficeStateOrProvince ?? null,
    officePostalCode: raw.OfficePostalCode ?? null,
    officeType: raw.OfficeType ?? null,
    officeStatus: raw.OfficeStatus ?? null,
    modificationTimestamp: raw.ModificationTimestamp
      ? new Date(raw.ModificationTimestamp)
      : null,
  };
}

/**
 * Upserts a list of BridgeOffice records in chunks.
 * Returns the number of records written.
 */
export async function ingestOffices(records: BridgeOffice[]): Promise<number> {
  let written = 0;

  for (let i = 0; i < records.length; i += INGEST_CHUNK_SIZE) {
    const chunk = records.slice(i, i + INGEST_CHUNK_SIZE);

    await prisma.$transaction(
      chunk.map((raw) => {
        const fields = mapOfficeToFields(raw);
        return prisma.office.upsert({
          where: { officeKey: raw.OfficeKey },
          update: fields,
          create: { officeKey: raw.OfficeKey, ...fields },
        });
      })
    );

    written += chunk.length;
  }

  return written;
}
