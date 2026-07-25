import fs from 'fs';
import path from 'path';

describe('DM-38: Money-movement Guardrail Suite', () => {
  // Prohibited keywords in marketplace and crowdfunding surfaces
  const prohibitedKeywords = [
    'PaymentElement',
    'CardElement',
    'CardNumberElement',
    'loadStripe',
    'StripeProvider',
    'useStripe',
    'useElements',
    'routing_number',
    'routingNumber',
    'account_number',
    'accountNumber',
    'microdeposit',
    'dwolla',
    'synapse',
    'identity_verification',
  ];

  // Specific directories/files corresponding to marketplace & crowdfunding surfaces
  const surfaces = [
    path.join(process.cwd(), 'src/components/listings'),
    path.join(process.cwd(), 'src/components/project/SoftCommitWidget.tsx'),
    path.join(process.cwd(), 'src/components/project/IndicationAggregate.tsx'),
    path.join(process.cwd(), 'src/app/dashboard/deals'),
    path.join(process.cwd(), 'src/app/invest'),
    path.join(process.cwd(), 'src/app/api/invitations'),
  ];

  // Helper to recursively collect files
  const getFilesRecursive = (dirOrFile: string): string[] => {
    if (!fs.existsSync(dirOrFile)) return [];
    const stat = fs.statSync(dirOrFile);
    if (stat.isFile()) return [dirOrFile];

    let results: string[] = [];
    const list = fs.readdirSync(dirOrFile);
    for (const file of list) {
      const filePath = path.join(dirOrFile, file);
      results = results.concat(getFilesRecursive(filePath));
    }
    return results;
  };

  it('asserts the absolute absence of every prohibited capability of G-4 across marketplace/crowdfunding codebases', () => {
    const filesToScan: string[] = [];
    for (const surface of surfaces) {
      filesToScan.push(...getFilesRecursive(surface));
    }

    expect(filesToScan.length).toBeGreaterThan(0);

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Perform simple checks for each prohibited money-movement term
      for (const keyword of prohibitedKeywords) {
        // Use regex for case-insensitive check and clean boundaries where helpful
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(content)) {
          throw new Error(
            `Guardrail Violation: Prohibited money-movement keyword "${keyword}" was found in ${file}. Marketplace and crowdfunding surfaces are strictly non-transactional.`
          );
        }
      }
    }
  });

  it('performs a dependency audit of package.json to assert no prohibited payment/escrow/KYC libraries are introduced', () => {
    const packagePath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Whitelist allowed dependencies
    const prohibitedDeps = [
      'dwolla',
      'synapse',
      'identity-verification',
      'kyc',
      'escrow',
      'paypal',
      'braintree',
      'adyen',
      'coinbase',
    ];

    for (const dep of Object.keys(dependencies)) {
      for (const prohibited of prohibitedDeps) {
        if (dep.toLowerCase().includes(prohibited)) {
          throw new Error(
            `Guardrail Violation: Prohibited dependency "${dep}" detected in package.json. Payment, escrow, and KYC libraries are prohibited.`
          );
        }
      }
    }
  });
});
