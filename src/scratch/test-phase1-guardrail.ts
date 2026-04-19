import { BridgePropertySchema } from '../lib/types/bridge';
import { normalizeMLSData } from '../lib/services/mlsShared';

/**
 * 🧪 Phase 1 Verification Script
 * Validates the System Guardrail logic: Schema -> Validation -> Normalization
 */

async function runVerification() {
  console.log('🧪 Starting Phase 1 Verification: The System Guardrail\n');

  // 1. Mock Raw Bridge Data (RESO OData v1.1.0 format)
  const mockRawData = {
    ListingKey: 'RK_12345',
    ListingId: 'ID_67890',
    StandardStatus: 'Active',
    UnparsedAddress: '123 Guardrail Way',
    BedroomsTotal: 4,
    BathroomsFull: 2,
    BathroomsHalf: 1,
    LivingArea: 2500,
    ListPrice: 750000,
    PublicRemarks: 'Beautifully fortified property with state-of-the-art guardrails.',
    Media: [
      {
        MediaURL: 'https://example.com/photo1.jpg',
        Order: 1,
        MediaCategory: 'High Res'
      },
      {
        MediaURL: 'https://example.com/photo2.jpg',
        Order: 2,
        MediaCategory: 'Interior'
      }
    ]
  };

  console.log('--- Step 1: Schema Validation ---');
  const validationResult = BridgePropertySchema.safeParse(mockRawData);
  if (validationResult.success) {
    console.log('✅ BridgePropertySchema validated successfully.');
  } else {
    console.error('❌ BridgePropertySchema validation failed:', validationResult.error.format());
    process.exit(1);
  }

  console.log('\n--- Step 2: Data Normalization ---');
  const normalized = normalizeMLSData(validationResult.data);
  
  console.log('Normalized Result:');
  console.log(JSON.stringify(normalized, null, 2));

  // Assertions
  const checks = [
    normalized.mls_id === 'RK_12345',
    normalized.address === '123 Guardrail Way',
    normalized.beds === 4,
    normalized.baths === 2.5, // 2 full + 1 half
    normalized.price === 750000,
    normalized.status === 'Listed',
    normalized.photos.length === 2
  ];

  if (checks.every(Boolean)) {
    console.log('\n✅ Normalization logic passed all assertions.');
  } else {
    console.error('\n❌ Normalization logic failed assertions.');
    process.exit(1);
  }

  console.log('\n--- Step 3: Telemetry Check ---');
  console.log('Note: Telemetry is applied in apiClient.ts. Running Bridge API calls will now log duration.');

  console.log('\n✨ Phase 1 Verification COMPLETE. Guardrail is active.');
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
