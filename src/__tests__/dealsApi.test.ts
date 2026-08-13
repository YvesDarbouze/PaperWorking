import { NextRequest } from 'next/server';
import { GET as getDeals, type ApiDealPayload } from '@/app/api/deals/route';
import { GET as getDealExists } from '@/app/api/deals/exists/route';

interface DealsListResponse {
  success: boolean;
  deals: ApiDealPayload[];
}

async function parseDealsList(res: Response): Promise<DealsListResponse> {
  return res.json() as Promise<DealsListResponse>;
}

describe('GET /api/deals Endpoint & Visibility Control', () => {
  it('returns published marketplace deal listings on Discover tab', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover');
    const res = await getDeals(req);
    expect(res.status).toBe(200);

    const json = await parseDealsList(res);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.deals)).toBe(true);
    expect(json.deals.every((d) => (d.visibility || 'marketplace') === 'marketplace')).toBe(true);
  });

  it('excludes invitation_only deals from Discover tab', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover');
    const res = await getDeals(req);
    const json = await parseDealsList(res);

    const invitationOnlyDeal = json.deals.find((d) => d.id === 'deal_unlisted_invitation');
    expect(invitationOnlyDeal).toBeUndefined();
  });

  it('includes invitation_only deals on My Activity tab for invited user', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=my_activity&userId=user_invited_2');
    const res = await getDeals(req);
    const json = await parseDealsList(res);

    const invitationOnlyDeal = json.deals.find((d) => d.id === 'deal_unlisted_invitation');
    expect(invitationOnlyDeal).toBeDefined();
  });

  it('treats tab=my-activity the same as tab=my_activity', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=my-activity&userId=user_invited_2');
    const res = await getDeals(req);
    const json = await parseDealsList(res);

    const invitationOnlyDeal = json.deals.find((d) => d.id === 'deal_unlisted_invitation');
    expect(invitationOnlyDeal).toBeDefined();
  });

  it('filters deals by propertyType parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?propertyType=Commercial');
    const res = await getDeals(req);
    const json = await parseDealsList(res);

    expect(json.success).toBe(true);
    expect(json.deals.every((d) => d.assetClass.toLowerCase() === 'commercial')).toBe(true);
  });

  it('sorts deals by price low to high when sort=price_asc', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?sort=price_asc');
    const res = await getDeals(req);
    const json = await parseDealsList(res);

    expect(json.success).toBe(true);
    const prices = json.deals.map((d) => d.purchasePrice);
    const sortedPrices = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sortedPrices);
  });
});

describe('GET /api/deals/exists Search Collision & Visibility Filtering', () => {
  it('shows marketplace deal in collision check', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals/exists?slug=123mainstaustintx78701');
    const res = await getDealExists(req);
    const json = await res.json();

    expect(json.exists).toBe(true);
    expect(json.deal.slug).toBe('123mainstaustintx78701');
  });

  it('hides invitation_only deal from search collision for non-invited user', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals/exists?slug=555unlistedstsanantoniotx78205&userId=user_stranger');
    const res = await getDealExists(req);
    const json = await res.json();

    expect(json.exists).toBe(false);
    expect(json.deal).toBeNull();
  });

  it('shows invitation_only deal in search collision for invited user', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals/exists?slug=555unlistedstsanantoniotx78205&userId=user_invited_vip');
    const res = await getDealExists(req);
    const json = await res.json();

    expect(json.exists).toBe(true);
    expect(json.deal.id).toBe('deal_unlisted');
  });
});
