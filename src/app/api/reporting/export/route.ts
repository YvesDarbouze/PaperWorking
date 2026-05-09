import { NextRequest, NextResponse } from 'next/server';

interface ExportRequest {
  format: 'csv' | 'pdf' | 'json';
  type: 'pl' | 'cashflow' | 'balance';
  projects: any[]; // Using any to avoid full type imports for this example
}

function fmt(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: ExportRequest = await req.json();
    const { format, type, projects } = body;
    
    // Server-side logging of the export request (audit log)
    console.log(`[AUDIT] User requested ${type} statement export in ${format} format for ${projects.length} project(s)`);

    let dataRows: any[] = [];
    
    if (type === 'pl') {
      let revenue = 0, purchaseCost = 0, rehabCosts = 0, acquisitionCosts = 0,
          financingCosts = 0, holdingCosts = 0, exitCosts = 0;

      projects.forEach(deal => {
        const fin = deal.financials;
        if (!fin) return;
        const salePrice = fin.actualSalePrice || fin.estimatedARV || 0;
        revenue += salePrice;
        purchaseCost += fin.purchasePrice || 0;
        rehabCosts += (fin.costs?.filter((c: any) => c.approved) || []).reduce((s: number, c: any) => s + c.amount, 0);
        
        if (deal.costBasisLedger) {
          const cb = deal.costBasisLedger;
          acquisitionCosts += [...(cb.directAcquisition || []), ...(cb.preClosing || [])].reduce((s: number, i: any) => s + i.amount, 0);
          financingCosts += (cb.financing || []).reduce((s: number, i: any) => s + i.amount, 0);
        }
        
        if (deal.holdingCosts) {
          holdingCosts += deal.holdingCosts.reduce((s: number, h: any) => s + h.monthlyAmount * h.monthsPaid, 0);
        }
        
        const loanAmount = fin.loanAmount || (fin.purchasePrice || 0);
        const interestRate = (fin.loanInterestRate || 0) / 100;
        const holdDays = fin.estimatedTimelineDays || 90;
        financingCosts += loanAmount * interestRate * (holdDays / 365);
        
        if (deal.exitCosts) {
          deal.exitCosts.forEach((ec: any) => {
            exitCosts += ec.isPercentage && ec.percentageRate ? (ec.percentageRate / 100) * salePrice : ec.amount;
          });
        }
        exitCosts += salePrice * ((fin.buyersAgentCommission || 0) / 100);
        exitCosts += salePrice * ((fin.sellersAgentCommission || 0) / 100);
        exitCosts += fin.finalClosingCosts || 0;
      });

      const cogs = purchaseCost + rehabCosts + acquisitionCosts;
      const grossProfit = revenue - cogs;
      const totalOpex = holdingCosts + financingCosts + exitCosts;
      const netProfit = grossProfit - totalOpex;

      dataRows = [
        ['Revenue', ''],
        ['Sale Proceeds (Actual or Projected ARV)', fmt(revenue)],
        ['Total Revenue', fmt(revenue)],
        ['', ''],
        ['Cost of Goods Sold', ''],
        ['Purchase Price', fmt(purchaseCost)],
        ['Rehab & Renovation', fmt(rehabCosts)],
        ['Acquisition & Pre-Closing', fmt(acquisitionCosts)],
        ['Total COGS', fmt(cogs)],
        ['', ''],
        ['GROSS PROFIT', fmt(grossProfit)],
        ['', ''],
        ['Operating Expenses', ''],
        ['Holding Costs', fmt(holdingCosts)],
        ['Financing Costs', fmt(financingCosts)],
        ['Exit Costs', fmt(exitCosts)],
        ['Total Operating Expenses', fmt(totalOpex)],
        ['', ''],
        ['NET PROFIT / (LOSS)', fmt(netProfit)],
      ];
    } else if (type === 'balance') {
      let propertyInventory = 0, cashFromSales = 0, hardMoneyDebt = 0, privateLenderEquity = 0;
      projects.forEach(deal => {
        const fin = deal.financials;
        if (!fin) return;
        if (deal.status === 'Sold') {
          const sp = fin.actualSalePrice || 0;
          cashFromSales += sp - sp * ((fin.buyersAgentCommission || 0) + (fin.sellersAgentCommission || 0)) / 100 - (fin.finalClosingCosts || 0);
        } else {
          propertyInventory += (fin.purchasePrice || 0) + (fin.costs?.filter((c: any) => c.approved).reduce((s: number, c: any) => s + c.amount, 0) || 0);
          hardMoneyDebt += fin.loanAmount || 0;
        }
        deal.fractionalInvestors?.forEach((inv: any) => { if (inv.status === 'confirmed') privateLenderEquity += inv.contributionAmount; });
      });
      const totalAssets = propertyInventory + cashFromSales;
      const totalLiabilities = hardMoneyDebt + privateLenderEquity;

      dataRows = [
        ['ASSETS', ''],
        ['Property Inventory (Book Value)', fmt(propertyInventory)],
        ['Cash from Sales', fmt(cashFromSales)],
        ['Total Assets', fmt(totalAssets)],
        ['', ''],
        ['LIABILITIES', ''],
        ['Hard Money / Construction Loans', fmt(hardMoneyDebt)],
        ['Private Investor Equity', fmt(privateLenderEquity)],
        ['Total Liabilities', fmt(totalLiabilities)],
        ['', ''],
        ["OWNER'S EQUITY", fmt(totalAssets - totalLiabilities)],
      ];
    } else if (type === 'cashflow') {
      const getMonthKey = (d: Date | string) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; };
      const buckets: Record<string, { inflows: number; outflows: number }> = {};
      const ensure = (k: string) => { if (!buckets[k]) buckets[k] = { inflows: 0, outflows: 0 }; };

      projects.forEach(deal => {
        const fin = deal.financials;
        if (!fin) return;
        if (deal.createdAt) { const k = getMonthKey(deal.createdAt); ensure(k); buckets[k].outflows += fin.purchasePrice || 0; }
        fin.costs?.forEach((c: any) => { if (c.approved && c.createdAt) { const k = getMonthKey(c.createdAt); ensure(k); buckets[k].outflows += c.amount; } });
        if (deal.status === 'Sold' && fin.actualSalePrice && fin.soldDate) { const k = getMonthKey(fin.soldDate); ensure(k); buckets[k].inflows += fin.actualSalePrice; }
      });

      const sorted = Object.keys(buckets).sort();
      let cum = 0;
      dataRows = [['Month', 'Inflows', 'Outflows', 'Net Cash', 'Cumulative']];
      sorted.forEach(k => {
        const b = buckets[k];
        const net = b.inflows - b.outflows;
        cum += net;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const [y, m] = k.split('-');
        dataRows.push([`${months[parseInt(m)-1]} ${y}`, fmt(b.inflows), fmt(b.outflows), fmt(net), fmt(cum)]);
      });
    }

    if (format === 'csv') {
      const csvString = dataRows.map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
      return new NextResponse(csvString, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="export_${type}.csv"`,
        },
      });
    } else {
      // For PDF, return the structured data so the frontend can render it using jsPDF, 
      // but the data is calculated and verified server-side.
      return NextResponse.json({
        success: true,
        data: dataRows
      });
    }
  } catch (error: any) {
    console.error('Export API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}
