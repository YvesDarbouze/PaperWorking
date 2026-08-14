import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';

const prodFirebaseConfig = {
  apiKey: "AIzaSyDlmH8L2s9_IXXKUx9DIhhWP4nMYDzUlvg",
  authDomain: "paperworking-97055.firebaseapp.com",
  projectId: "paperworking-97055",
};

async function testGate1And2() {
  console.log('--- PRE-FLIGHT GATE CHECK ---');
  console.log('Target Production URL: https://paperworking.co/');
  console.log('Firebase Project ID:', prodFirebaseConfig.projectId);

  const app = initializeApp(prodFirebaseConfig);
  const auth = getAuth(app);

  const testEmail = `agent00.preflight.gate${Date.now()}@paperworking-test.dev`;
  const testPass = 'PreflightGate123!';

  console.log(`\nTesting Gate 2 (Signup & Email Verification): Attempting signup for ${testEmail}...`);
  try {
    const credential = await createUserWithEmailAndPassword(auth, testEmail, testPass);
    const user = credential.user;
    console.log(`Gate 2 Result: Signup SUCCESSFUL! UID: ${user.uid}, emailVerified: ${user.emailVerified}`);

    console.log('\nTesting Gate 1 (Stripe Mode Detection): Fetching ID token and requesting checkout session...');
    const idToken = await user.getIdToken();

    const response = await fetch('https://paperworking.co/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: 'individual',
        userEmail: testEmail,
        idToken,
      }),
    });

    const status = response.status;
    const body = await response.json();

    console.log(`Gate 1 HTTP Status: ${status}`);
    console.log('Gate 1 Response Body:', JSON.stringify(body, null, 2));

    if (body.url) {
      if (body.url.includes('cs_test_')) {
        console.log('Gate 1 Result: STRIPE TEST MODE DETECTED (cs_test_ URL returned). Safe to use card 4242 4242 4242 4242.');
      } else if (body.url.includes('cs_live_')) {
        console.log('Gate 1 Result: STRIPE LIVE MODE DETECTED (cs_live_ URL returned). DO NOT USE CREDIT CARDS!');
      } else if (body.url.includes('cs_mock_')) {
        console.log('Gate 1 Result: STRIPE MOCK MODE DETECTED (cs_mock_ URL returned). Billing is simulated.');
      } else {
        console.log(`Gate 1 Result: Checkout URL generated: ${body.url}`);
      }
    } else {
      console.log('Gate 1 Result Error Detail:', body.error || body.detail);
    }

    // Clean up temporary user
    console.log('\nCleaning up temporary pre-flight user...');
    await deleteUser(user);
    console.log('Cleanup complete.');
  } catch (err: unknown) {
    console.error('Pre-flight test failed:', err);
  }
}

testGate1And2().catch(console.error);
