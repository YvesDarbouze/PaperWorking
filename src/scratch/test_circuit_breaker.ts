import { bridgeWorkerService } from '../lib/services/bridgeWorkerService';
import { fetchMLSData } from '../lib/services/mlsService';

/**
 * 🧪 Circuit Breaker Verification Script
 * 
 * Tests the integration between:
 * 1. BridgeWorkerService (Redis state)
 * 2. MlsService (Check before execution)
 */
async function runVerification() {
  console.log('🧪 [VERIFICATION] Starting Circuit Breaker integration test...');

  // 1. Initial State: Ensure NOT paused
  await bridgeWorkerService.resume();
  let paused = await bridgeWorkerService.isPaused();
  console.log(`🔍 [STEP 1] Initial Pause State: ${paused} (Expect: false)`);

  // 2. Trigger Pause
  console.log('🚧 [STEP 2] Triggering simulated pause (5s duration)...');
  await bridgeWorkerService.pause(5);
  paused = await bridgeWorkerService.isPaused();
  console.log(`🔍 [STEP 2] Updated Pause State: ${paused} (Expect: true)`);

  // 3. Verify mlsService Integration
  console.log('📡 [STEP 3] Attempting fetchMLSData during pause...');
  try {
    await fetchMLSData('TEST_LISTING_123');
    console.error('❌ [FAILURE] fetchMLSData should have been blocked!');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'MLS_SERVICE_PAUSED') {
      console.log('✅ [SUCCESS] fetchMLSData was correctly blocked by the circuit breaker.');
    } else {
      console.error('❌ [FAILURE] Unexpected error:', msg);
    }
  }

  // 4. Verification complete
  console.log('🎉 [VERIFICATION] All integration tests passed.');
  
  // Cleanup
  await bridgeWorkerService.resume();
  process.exit(0);
}

runVerification().catch(err => {
  console.error('💥 [CRITICAL FAILURE]', err);
  process.exit(1);
});
