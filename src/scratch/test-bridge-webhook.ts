/**
 * 🧪 Test Script: Bridge Webhook Ingestion
 * 
 * Simulates an incoming POST from Zillow Bridge Interactive.
 * Follows the 'Webhooks / Streaming' RESO OData format.
 */

const LOCAL_WEBHOOK_URL = 'http://localhost:3000/api/webhooks/bridge';

// Mock Payload: RESO ResourceRecord wrapper
const mockBridgePayload = {
  "ResourceRecord": {
    "ListingKey": "PROPERTY_SHERLOCK_221B", // Should match a deal's mls_id
    "ListingId": "MLS-12345",
    "StandardStatus": "Active Under Contract", // Maps to 'Under Contract'
    "UnparsedAddress": "221B Baker St, London, NW1 6XE",
    "BedroomsTotal": 3,
    "BathroomsFull": 2,
    "BathroomsHalf": 1,
    "LivingArea": 1850,
    "ListPrice": 45000000,
    "PublicRemarks": "Status update received via Bridge OData stream."
  }
};

async function testWebhook() {
  console.log('🚀 Starting Bridge Webhook Simulation...');
  console.log(`📡 Targeting: ${LOCAL_WEBHOOK_URL}`);
  
  try {
    const response = await fetch(LOCAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockBridgePayload),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Webhook Processed Successfully!');
      console.log('📊 Result:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Webhook Failed!');
      console.error('🛑 Status:', response.status);
      console.error('📝 Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('🔥 Connection Failed:', error);
    console.log('\n💡 Tip: Make sure your local dev server is running (npm run dev).');
  }
}

testWebhook();
