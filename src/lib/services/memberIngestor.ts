/**
 * src/lib/services/memberIngestor.ts
 *
 * Responsible for writing a batch of raw Bridge Member records into Postgres
 * via Prisma. Mirrors the propertyIngestor pattern for consistency.
 *
 * Single responsibility: raw Member records → validated → chunked upserts → DB.
 */

import prisma from '../prisma';
import type { BridgeMember } from '../types/bridge';

export const INGEST_CHUNK_SIZE = 100;

/**
 * Converts a raw Bridge Member record into the Prisma-ready shape.
 * Pure function — no I/O, easy to test.
 */
export function mapMemberToFields(raw: BridgeMember) {
  return {
    memberMlsId: raw.MemberMlsId ?? null,
    memberFullName: raw.MemberFullName ?? null,
    memberFirstName: raw.MemberFirstName ?? null,
    memberLastName: raw.MemberLastName ?? null,
    memberEmail: raw.MemberEmail ?? null,
    memberDirectPhone: raw.MemberDirectPhone ?? null,
    memberMobilePhone: raw.MemberMobilePhone ?? null,
    memberStateLicense: raw.MemberStateLicense ?? null,
    memberDesignation: raw.MemberDesignation
      ? JSON.stringify(raw.MemberDesignation)
      : null,
    officeName: raw.OfficeName ?? null,
    officeKey: raw.OfficeKey ?? null,
    officeMlsId: raw.OfficeMlsId ?? null,
    media: raw.Media && raw.Media.length > 0
      ? JSON.stringify(raw.Media)
      : null,
    modificationTimestamp: raw.ModificationTimestamp
      ? new Date(raw.ModificationTimestamp)
      : null,
  };
}

/**
 * Upserts a list of BridgeMember records in chunks.
 * Returns the number of records written.
 */
export async function ingestMembers(records: BridgeMember[]): Promise<number> {
  let written = 0;

  for (let i = 0; i < records.length; i += INGEST_CHUNK_SIZE) {
    const chunk = records.slice(i, i + INGEST_CHUNK_SIZE);

    await prisma.$transaction(
      chunk.map((raw) => {
        const fields = mapMemberToFields(raw);
        return prisma.member.upsert({
          where: { memberKey: raw.MemberKey },
          update: fields,
          create: { memberKey: raw.MemberKey, ...fields },
        });
      })
    );

    written += chunk.length;
  }

  return written;
}
