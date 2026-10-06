/**
 * Property Image Resolution Helper
 *
 * Maps property asset classes and strategies to high-resolution, locally hosted
 * architectural property assets per NO-MOCK CONTRACT rule 2 (no stock/placeholder URLs).
 */

export const PROPERTY_IMAGES = {
  DEFAULT_RESIDENTIAL: '/images/properties/deal-property-default.jpg',
  DUPLEX: '/images/properties/deal-property-duplex.jpg',
  MULTIFAMILY: '/images/properties/multifamily-modern.jpg',
  COMMERCIAL: '/images/properties/commercial-modern.jpg',
  INDUSTRIAL: '/images/properties/industrial-modern.jpg',
} as const;

export function getDefaultPropertyImage(assetClass?: string, strategy?: string): string {
  const normalizedClass = (assetClass || '').toLowerCase();
  const normalizedStrategy = (strategy || '').toLowerCase();

  if (
    normalizedClass.includes('industrial') ||
    normalizedClass.includes('warehouse') ||
    normalizedClass.includes('logistics') ||
    normalizedStrategy.includes('industrial')
  ) {
    return PROPERTY_IMAGES.INDUSTRIAL;
  }

  if (
    normalizedClass.includes('commercial') ||
    normalizedClass.includes('office') ||
    normalizedClass.includes('retail') ||
    normalizedClass.includes('flex') ||
    normalizedStrategy.includes('commercial')
  ) {
    return PROPERTY_IMAGES.COMMERCIAL;
  }

  if (
    normalizedClass.includes('multi') ||
    normalizedClass.includes('apartment') ||
    normalizedStrategy.includes('syndication')
  ) {
    return PROPERTY_IMAGES.MULTIFAMILY;
  }

  if (
    normalizedClass.includes('duplex') ||
    normalizedClass.includes('fourplex') ||
    normalizedClass.includes('triplex') ||
    normalizedStrategy.includes('brrrr')
  ) {
    return PROPERTY_IMAGES.DUPLEX;
  }

  return PROPERTY_IMAGES.DEFAULT_RESIDENTIAL;
}

export const BANNED_STOCK_DOMAINS = [
  'images.unsplash.com',
  'unsplash.com',
  'via.placeholder.com',
  'placeholder.com',
  'picsum.photos',
  'loremflickr.com',
  'placehold.it',
  'placehold.co',
] as const;

/**
 * Checks whether an image URL points to a stock placeholder service or broken placeholder path.
 */
export function isPlaceholderOrStockUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed === '' ||
    trimmed === '/images/deals/deal-placeholder.webp' ||
    trimmed.includes('deal-placeholder')
  ) {
    return true;
  }
  return BANNED_STOCK_DOMAINS.some((domain) => trimmed.includes(domain));
}

/**
 * Sanitizes deal image URLs, permanently replacing any stock/placeholder or broken URLs
 * with the appropriate real architectural photography asset based on assetClass and strategy.
 */
export function sanitizeDealImageUrl(
  providedUrl: string | null | undefined,
  assetClass?: string,
  strategy?: string,
): string {
  if (isPlaceholderOrStockUrl(providedUrl)) {
    return getDefaultPropertyImage(assetClass, strategy);
  }
  return providedUrl!.trim();
}

