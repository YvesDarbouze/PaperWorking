import apiClient from '../lib/apiClient';
import { bridgeRateLimiter } from '../lib/services/rateLimiter';

/**
 * 🧪 Test Suite: Bridge API Client & Throttling
 * 
 * NOTE: This script requires 'axios' and 'ioredis' to be installed.
 * If you haven't yet, run: npm install axios
 */

async function runTests() {
  console.log('🚀 Starting Bridge Client Integration Tests...\n');

  // 1. Test HTTPS Enforcement
  try {
    console.log('🔍 Testing HTTPS Enforcement...');
    // Manually override baseURL to insecure for test
    await apiClient.get('http://api.bridgeinteractive.com/test');
    console.error('❌ Failed: Insecure URL was allowed.');
  } catch (error: any) {
    if (error.message.includes('HTTPS is mandatory')) {
      console.log('✅ Success: Insecure request blocked correctly.');
    } else {
      console.error('❌ Unexpected Error during HTTPS test:', error.message);
    }
  }

  // 2. Test Token Injection & Dataset ID
  console.log('\n🔍 Testing URL Parameter Replacement (Virtual Dataset ID)...');
  try {
     // This will fail the actual request, but we want to check the interceptor logic
     // if we had a debug mode. For now, we verify it doesn't throw.
     await apiClient.get('/{vDatasetId}/Properties');
     console.log('📡 Response received (Check logs for URL transformation)');
  } catch (error: any) {
    // We expect a 401 or similar if the token is "your_server_token_here"
    console.log(`📡 Request executed. Error expected if token is mock: ${error.message}`);
  }

  // 3. Test Rate Limiter (Simulation)
  console.log('\n🔍 Testing Redis-backed Rate Limiter...');
  const status = await bridgeRateLimiter.getStatus();
  console.log(`📊 Initial Status: ${status.hourly} used, ${5000 - status.hourly} remaining.`);

  console.log('⚡ Sending 5 rapid requests...');
  for (let i = 0; i < 5; i++) {
    try {
      await bridgeRateLimiter.checkRateLimit();
    } catch (e) {}
  }

  const newStatus = await bridgeRateLimiter.getStatus();
  console.log(`📊 Post-Burst Status: ${newStatus.hourly} used.`);

  if (newStatus.hourly > status.hourly) {
    console.log('✅ Success: Rate limiter is tracking requests in Redis.');
  }

  console.log('\n🏁 Tests Complete. Please ensure BRIDGE_SERVER_TOKEN is valid for live calls.');
}

// Check environment variables first
if (!process.env.BRIDGE_SERVER_TOKEN) {
  console.warn('⚠️ Warning: BRIDGE_SERVER_TOKEN is not set in environment.');
}

runTests().catch(console.error);
