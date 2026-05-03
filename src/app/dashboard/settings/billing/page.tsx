'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Loader2, ExternalLink, Download, FileText, Lock } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/* ═══════════════════════════════════════════════════════
   Billing & Subscription Settings

   Refactored to render inside the settings layout shell.
   Four cards:
   1. Current Plan Overview — tier + pricing + next billing
   2. Payment Method — masked card on file
   3. Invoice History — downloadable table
   4. Account Details — summary info
   ═══════════════════════════════════════════════════════ */

const PLAN_PRICING: Record<string, { label: string; price: string; period: string }> = {
  'Individual':      { label: 'Individual',          price: '$59',  period: '/mo' },
  'Team':            { label: 'Investor Team',       price: '$99',  period: '/mo' },
  'Lawyer Lead-Gen': { label: 'Service Professional', price: '$79', period: '/mo' },
  'None':            { label: 'No active plan',      price: '—',    period: ''    },
};

const STATUS_BADGE: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  active:   { label: 'Active',   cls: 'bg-green-50  text-green-700 border-green-200',  Icon: CheckCircle2  },
  past_due: { label: 'Past Due', cls: 'bg-amber-50  text-amber-700 border-amber-200',  Icon: AlertTriangle },
  canceled: { label: 'Canceled', cls: 'bg-red-50    text-red-700   border-red-200',     Icon: AlertTriangle },
  inactive: { label: 'Inactive', cls: 'bg-bg-primary  text-text-secondary  border-border-accent',   Icon: AlertTriangle },
};

interface BillingInvoice {
  id: string;
  number: string | null;
  date: string;
  amount: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export default function BillingSettingsPage() {
  const { user, profile } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]     = useState<string | null>(null);
  const [invoices, setInvoices]           = useState<BillingInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setInvoicesLoading(true);
    user.getIdToken().then((idToken) =>
      fetch('/api/stripe/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
        .then((r) => r.json())
        .then((data) => { if (data.invoices) setInvoices(data.invoices); })
        .catch(() => {})
        .finally(() => setInvoicesLoading(false))
    );
  }, [user]);

  const plan    = profile?.subscriptionPlan   ?? 'None';
  const status  = profile?.subscriptionStatus ?? 'inactive';
  const lastFour = profile?.lastFour ?? '4242';
  const cardBrand = profile?.cardBrand ?? 'Visa';

  const planInfo    = PLAN_PRICING[plan]   ?? PLAN_PRICING['None'];
  const statusBadge = STATUS_BADGE[status] ?? STATUS_BADGE['inactive'];
  const StatusIcon  = statusBadge.Icon;

  // Calculate next billing date (mock: 1st of next month)
  const now = new Date();
  const nextBilling = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextBillingStr = nextBilling.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const openPortal = async () => {
    if (!user) return;
    setPortalLoading(true);
    setPortalError(null);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to open billing portal.');
      window.location.href = data.url;
    } catch (err: any) {
      setPortalError(err.message);
      setPortalLoading(false);
    }
  };

  return (
    <div className="dashboard-context space-y-8">
      
      {/* ═══ Card 1: Subscription Overview ═══ */}
      <section className="bg-white border border-border-accent p-8 rounded-[8px] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-1">Current Subscription</h2>
            <p className="text-xl font-bold text-[#595959]">{planInfo.label}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest border px-3 py-1 rounded-full ${statusBadge.cls}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusBadge.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-8 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-2">Monthly Commitment</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-light text-[#595959]">{planInfo.price}</span>
              <span className="text-sm text-[#7F7F7F]">{planInfo.period}</span>
            </div>
          </div>
          
          {plan !== 'None' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-2">Next Billing Date</p>
              <p className="text-sm font-bold text-[#595959]">{nextBillingStr}</p>
            </div>
          )}
        </div>

        <button
          onClick={openPortal}
          disabled={portalLoading}
          className="ag-button !w-auto !px-8 !py-3 !text-xs font-bold uppercase tracking-widest"
        >
          {portalLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Synchronizing…</>
          ) : (
            <>Manage Subscription <ExternalLink className="w-4 h-4 ml-2" /></>
          )}
        </button>
      </section>

      {/* ═══ Card 2: Payment Method (Credit Card Manager) ═══ */}
      <section className="bg-white border border-border-accent p-8 rounded-[8px] shadow-sm">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F] mb-6">Payment Method</h2>

        {(profile?.stripeCustomerId || plan !== 'None') ? (
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gray-50 border border-border-accent rounded-[8px]">
            <div className="w-16 h-10 bg-[#595959] rounded flex items-center justify-center shadow-md">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-sm font-bold text-[#595959]">{cardBrand} ending in •••• {lastFour}</p>
              <p className="text-xs text-[#7F7F7F] flex items-center justify-center md:justify-start gap-1 mt-1">
                <Lock className="w-3 h-3" /> Secure Payment via Stripe
              </p>
            </div>
            <button
              onClick={openPortal}
              className="text-xs font-bold text-[#595959] uppercase tracking-widest hover:underline px-4 py-2"
            >
              Update Card
            </button>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-[8px]">
            <CreditCard className="w-8 h-8 text-[#A5A5A5] mx-auto mb-3" />
            <p className="text-sm text-[#7F7F7F] mb-4">No institutional payment method detected.</p>
            <Link href="/pricing" className="ag-button !w-auto !px-6 !text-xs">
              Configure Payment
            </Link>
          </div>
        )}

        {portalError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-[8px]">
            {portalError}
          </div>
        )}
      </section>

      {/* ═══ Card 3: Billing Archive (Invoices) ═══ */}
      <section className="bg-white border border-border-accent p-8 rounded-[8px] shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Billing Archive</h2>
          {plan !== 'None' && (
            <button className="text-[10px] font-bold text-[#595959] uppercase tracking-widest hover:underline">
              Download All
            </button>
          )}
        </div>

        {invoicesLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#A5A5A5]" />
          </div>
        ) : plan === 'None' || invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-[#A5A5A5] mx-auto mb-3 opacity-20" />
            <p className="text-sm text-[#7F7F7F]">No transactional history recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Statement</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Issue Date</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Amount</th>
                  <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7F7F7F]">Status</th>
                  <th className="px-8 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-4">
                      <span className="flex items-center gap-2 text-sm font-bold text-[#595959]">
                        <FileText className="w-4 h-4 text-[#A5A5A5]" />
                        {inv.number ?? inv.id}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-sm text-[#7F7F7F]">{inv.date}</td>
                    <td className="px-8 py-4 text-sm font-bold text-[#595959]">{inv.amount}</td>
                    <td className="px-8 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border rounded-sm ${
                        inv.status === 'paid'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : inv.status === 'open'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-gray-50 text-[#7F7F7F] border-gray-100'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      {inv.pdfUrl ? (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-[#A5A5A5] hover:text-[#595959] transition-colors inline-block"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="p-2 text-[#D5D5D5] inline-block">
                          <Download className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
