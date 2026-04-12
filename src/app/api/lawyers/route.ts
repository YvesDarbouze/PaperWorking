import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stateCode = searchParams.get('state');

  if (!stateCode) {
    return NextResponse.json({ error: 'State code is required' }, { status: 400 });
  }

  // Mocking the database query for Lawyers with Active Lead-Gen Subscriptions in specific physical domains
  const mockLawyers = [
    {
      uid: 'lawyer_001',
      displayName: 'Esquire Title & Trust LLC',
      email: 'closings@esquiretrust.com',
      state: 'FL',
      subscriptionPlan: 'Lawyer Lead-Gen',
      activeStatus: true,
      verifiedTitleAgent: true
    },
    {
      uid: 'lawyer_002',
      displayName: 'TX Absolute Capital Law',
      email: 'partners@txabsolute.com',
      state: 'TX',
      subscriptionPlan: 'Lawyer Lead-Gen',
      activeStatus: true,
      verifiedTitleAgent: true
    },
    {
      uid: 'lawyer_003',
      displayName: 'Universal Closings Alliance',
      email: 'contact@uca-law.com',
      state: stateCode, // Will dynamically match whichever state the UI requests for simulation
      subscriptionPlan: 'Lawyer Lead-Gen',
      activeStatus: true,
      verifiedTitleAgent: true
    }
  ];

  const matchedLawyers = mockLawyers.filter(lw => lw.state.toUpperCase() === stateCode.toUpperCase());

  // Simulating Server latency constraint
  await new Promise(resolve => setTimeout(resolve, 800));

  return NextResponse.json({ success: true, lawyers: matchedLawyers });
}
