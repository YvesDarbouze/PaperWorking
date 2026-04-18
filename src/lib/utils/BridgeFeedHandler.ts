/**
 * 🛰️ BridgeFeedHandler
 * 
 * specializes in analyzing RESO 'FeedTypes' metadata to identify data licensing sources.
 * critical for compliance (IDX vs VOW) when working with combined virtual datasets.
 */

export type FeedTypeSource = 'IDX' | 'VOW' | 'BROKER' | 'OFFER_COMP' | 'UNKNOWN';

export interface BridgeRecord {
  ListingId?: string;
  FeedTypes?: string[];
  [key: string]: any;
}

export class BridgeFeedHandler {
  /**
   * Logs a breakdown of licensing sources for a batch of records.
   * Helps audit cross-feed data redistribution compliance.
   */
  static logSourceBreakdown(records: BridgeRecord[]): void {
    if (!records || records.length === 0) return;

    const stats = {
      idx: 0,
      vow: 0,
      both: 0,
      other: 0,
      missing: 0
    };

    records.forEach(record => {
      const types = record.FeedTypes || [];
      
      if (types.length === 0) {
        stats.missing++;
        return;
      }

      const hasIdx = types.includes('IDX');
      const hasVow = types.includes('VOW');

      if (hasIdx && hasVow) stats.both++;
      else if (hasIdx) stats.idx++;
      else if (hasVow) stats.vow++;
      else stats.other++;
    });

    console.log('📊 [BRIDGE FEED AUDIT] License Source Breakdown:');
    console.table({
      'IDX Only': stats.idx,
      'VOW Only': stats.vow,
      'Combined (IDX+VOW)': stats.both,
      'Other Distribution': stats.other,
      'Untagged Records': stats.missing
    });
  }

  /**
   * Identifies the primary source for a single record.
   */
  static getPrimarySource(record: BridgeRecord): FeedTypeSource {
    const types = record.FeedTypes || [];
    if (types.includes('VOW')) return 'VOW';
    if (types.includes('IDX')) return 'IDX';
    if (types.includes('Brokerage')) return 'BROKER';
    return 'UNKNOWN';
  }

  /**
   * 🧼 Data Sanitization: Strips non-RESO namespaced fields.
   * If a field cannot be normalized to RESO standards, Bridge prefixes it with a namespace 
   * (e.g., 'Namespace.Field' or 'Custom:Field'). 
   */
  static sanitize(record: BridgeRecord): BridgeRecord {
    const sanitized: BridgeRecord = {};
    const NAMESPACE_REGEX = /[\.:]/;

    Object.keys(record).forEach(key => {
      // Logic: If the key contains a dot or colon, it's a namespaced/custom field that hasn't 
      // been normalized to RESO standard. We strip these to keep the database clean.
      if (!NAMESPACE_REGEX.test(key)) {
        sanitized[key] = record[key];
      }
    });

    return sanitized;
  }
}
