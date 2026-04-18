/**
 * 🧪 Standalone JS Verification for Case 4
 */

// Mini-implementation of the logic in BridgeQueryBuilder.ts
function formatValue(value) {
  if (typeof value === 'string') {
    const escaped = value.replace(/'/g, "''");
    return `'${encodeURIComponent(escaped).replace(/'/g, "%27")}'`;
  }
  return encodeURIComponent(value.toString());
}

function test() {
  const input = "Coeur d'Alene";
  const formatted = formatValue(input);
  
  console.log('--- Case 4 Verification ---');
  console.log('Input:', input);
  console.log('Logic step 1 (Double Quotes):', input.replace(/'/g, "''"));
  console.log('Result:', formatted);
  
  const expected = "'Coeur%20d%27%27Alene'";
  console.log('Expected:', expected);
  console.log('Match:', formatted === expected);
}

test();
