/**
 * 🔍 ODataMetadataParser
 * 
 * a specialized utility for parsing Bridge Interactive OData $metadata (CSDL) 
 * without external dependencies. optimized for extracting accessible fields.
 */
export class ODataMetadataParser {
  /**
   * Extracts all field names granted for the 'Property' entity type.
   * @param xml The raw XML response from the /OData/$metadata endpoint.
   */
  static extractPropertyFields(xml: string): string[] {
    const fields: string[] = [];
    
    // 1. Locate the Property EntityType block
    // RESO Standard stores the main listing data in the 'Property' entity.
    const propertyBlockMatch = /<EntityType\s+Name="Property"[^>]*>([\s\S]*?)<\/EntityType>/i.exec(xml);
    
    if (!propertyBlockMatch) {
      console.warn('⚠️ [METADATA PARSER] Could not find EntityType Name="Property" in metadata.');
      return [];
    }

    const propertyBlock = propertyBlockMatch[1];

    // 2. Extract all 'Property' tags (which represent columns/fields)
    // Format: <Property Name="ListingId" Type="Edm.String" ... />
    const propertyRegex = /<Property\s+Name="([^"]+)"/gi;
    let match;

    while ((match = propertyRegex.exec(propertyBlock)) !== null) {
      if (match[1]) {
        fields.push(match[1]);
      }
    }

    return fields;
  }
}
