import { type BridgeMedia } from '../types/bridge';

/**
 * 📷 BridgeMediaParser
 * 
 * Specialized utility for high-resolution photo extraction from 
 * the Bridge Interactive / RESO Web API data structures.
 * 
 * Logic follows RESO standards for the 'Media' object.
 */
export class BridgeMediaParser {
  // Common high-resolution categories in Bridge-hosted feeds
  private static readonly HIGH_RES_CATEGORIES = ['High Res', 'Photos', 'Primary', 'Large'];
  
  // Bridge CDN pattern for verification (optional)
  private static readonly CDN_PATTERN = 'bridgeinteractive.com';

  /**
   * Extracts a sorted list of high-resolution CDN URLs.
   */
  static extractHighResUrls(media: BridgeMedia[]): string[] {
    if (!media || media.length === 0) return [];

    return media
      .filter(item => this.isHighRes(item))
      .sort((a, b) => (a.Order || 0) - (b.Order || 0))
      .map(item => item.MediaURL)
      .filter(url => !!url); // Safety check
  }

  /**
   * Determines if a media item qualifies as high-resolution based on its metadata.
   */
  private static isHighRes(item: BridgeMedia): boolean {
    const category = item.MediaCategory || '';
    
    // 1. Explicit Category Match
    if (this.HIGH_RES_CATEGORIES.some(cat => category.includes(cat))) {
      return true;
    }
    
    // 2. Fallback: If no category is assigned, assume it's a primary photo if it has a URL
    if (!category && item.MediaURL) {
      return true;
    }

    // 3. Fallback: Check for Bridge CDN pattern even if category is ambiguous
    if (item.MediaURL?.includes(this.CDN_PATTERN)) {
      return true;
    }

    return false;
  }
}
