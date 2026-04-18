/**
 * 🧪 Test Script for BridgeQueryBuilder (V2)
 */
import { BridgeQueryBuilder } from '../lib/utils/BridgeQueryBuilder';

function runTests() {
  console.log('--- BridgeQueryBuilder Test Suite ---\n');

  // Test 4: URL Encoding and Escaping (Requested)
  // Filtering for a city with an apostrophe
  const q4 = new BridgeQueryBuilder()
    .filter('City', 'eq', "Coeur d'Alene")
    .build();
  
  console.log('Test 4 (Apostrophe Escaping):');
  console.log('Input: Coeur d\'Alene');
  console.log('Result:', q4);
  
  // Verification:
  // 1. Apostrophe doubled: Coeur d''Alene
  // 2. Encoded: Coeur%20d%27%27Alene
  // 3. Final: ?$filter=City eq 'Coeur%20d%27%27Alene'
  const expected4 = "?$filter=City eq 'Coeur%20d%27%27Alene'";
  console.log('Expected:', expected4);
  console.log('Pass:', q4 === expected4);
  console.log('');

  // Re-verify Test 1 for regression
  const q1 = new BridgeQueryBuilder()
    .filter('StandardStatus', 'eq', 'Active')
    .build();
  console.log('Test 1 (Regression):', q1);
  console.log('Pass:', q1 === "?$filter=StandardStatus eq 'Active'");
}

runTests();
