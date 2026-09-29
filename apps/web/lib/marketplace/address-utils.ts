/**
 * Extract the street address component from a full property address / serial number.
 * Example: "1247 Elm Street, Austin, TX 78702" -> "1247 Elm Street"
 */
export function extractStreetAddress(addressOrName: string): string {
  if (!addressOrName) return 'Commercial Property';
  const commaIndex = addressOrName.indexOf(',');
  if (commaIndex !== -1) {
    return addressOrName.slice(0, commaIndex).trim();
  }
  return addressOrName.trim();
}
