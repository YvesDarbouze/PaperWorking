import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { PlanCard } from './PlanCard';
import { PaymentMethodCard } from './PaymentMethodCard';
import { InvoiceTable } from './InvoiceTable';
import { ChangePlanModal } from './ChangePlanModal';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { AddCardModal } from './AddCardModal';

import { Plan } from '@/types/Plan';
import { useBilling } from '@/hooks/useBilling';

const CANONICAL_PLACES = {
  'Individual': { id: 'Individual', label: 'Investor', price: '$59', priceNum: 59 },
  'Team': { id: 'Team', label: 'Investment Team', price: '$99', priceNum: 99 },
  'Vendor Network': { id: 'Vendor Network', label: 'Vendor', price: '$39', priceNum: 39 },
  'None': { id: 'None', label: 'No active plan', price: '—', priceNum: 0 },
};

const PLAN_CARDS: Plan[] = [
  {
    id: 'Vendor Network',
    label: 'Vendor',
    price: '$39/mo',
    priceNum: 39,
    description: 'For appraisers, inspectors, and tradespeople.',
    features: [
      'Access vendor directory profile',
      'Submit deals & quotes',
      'Basic document sharing',
      'In-app message inbox',
    ],
    recommended: false,
  },
  {
    id: 'Individual',
    label: 'Investor',
    price: '$59/mo',
    priceNum: 59,
    description: 'Solo flippers tired of spreadsheet chaos.',
    features: [
      'Core REI underwriting tools',
      'RentCast live API valuation data',
      'Generate monthly/quarterly reports',
      'Standard document room integrations',
    ],
    recommended: false,
  },
  {
    id: 'Team',
    label: 'Investment Team',
    price: '$99/mo',
    priceNum: 99,
    description: 'Scaling REI businesses managing multiple deals.',
    features: [
      'Includes allInvestor tier capabilities',
      'Collaborate with up to 10 team seats',
      'Advanced role-based access control',
      'Shared team document workflows',
    ],
    recommended: true,
  },
];

export const BillingPage: React.FC = () => {
  const { openPortal, isLoading: portalLoading } = useBilling();
  const {
    billing,
    fetchBilling,
    changePlan,
    cancelSubscription,
    reactivateSubscription,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod
  } = useSettingsStore();

  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handlePlanChange = async (planId: string) => {
    setCheckoutLoading(planId);
    const tid = toast.loading(`Initiating switch to ${planId}...`);
    try {
      await changePlan(planId);
      toast.success(`Plan changed to ${planId} successfully.`, { id: tid });
      setShowChangePlan(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch plan. Please try again.', { id: tid });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    const tid = toast.loading('Canceling your subscription...');
    try {
      await cancelSubscription();
      toast.success('Subscription cancelled successfully.', { id: tid });
      setShowCancelModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel subscription. Please contact support.', { id: tid });
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivate = async () => {
    setReactivating(true);
    const tid = toast.loading('Reactivating your subscription...');
    try {
      await reactivateSubscription();
      toast.success('Subscription reactivated successfully.', { id: tid });
    } catch (err: any) {
      toast.error(err.message || 'Failed to reactivate. Please try again.', { id: tid });
    } finally {
      setReactivating(false);
    }
  };

  const handleAddCardSubmit = async (values: any) => {
    const brand = values.cardNumber.startsWith('4') ? 'visa' : values.cardNumber.startsWith('5') ? 'mastercard' : 'amex';
    const [expMonthStr, expYearStr] = values.expiry.split('/');
    
    try {
      await addPaymentMethod({
        brand,
        last4: values.cardNumber.slice(-4),
        expMonth: parseInt(expMonthStr, 10),
        expYear: 2000 + parseInt(expYearStr, 10),
      });
      toast.success('Payment method added successfully.');
      setShowAddCard(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to register card. Please verify details.');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPaymentMethod(id);
      toast.success('Default payment card set.');
    } catch (err: any) {
      toast.error(err.message || 'Could not update default payment method.');
    }
  };

  const handleRemoveCard = async (id: string) => {
    try {
      await removePaymentMethod(id);
      toast.success('Payment method removed.');
    } catch (err: any) {
      toast.error(err.message || 'Could not remove payment card.');
    }
  };

  const handleDownloadInvoice = (invId: string) => {
    toast.success(`Downloading statement invoice_${invId}.pdf...`);
    window.location.href = `/api/billing/invoices/${invId}/download`;
  };

  if (billing.loading && !billing.data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-xl" />
        <div className="h-48 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (billing.error) {
    return (
      <div className="p-6 text-center space-y-4 bg-red-50/50 border border-dashed border-red-200 rounded-xl">
        <p className="text-sm text-red-650 font-medium">
          Failed to retrieve billing information: {billing.error}
        </p>
        <button
          onClick={() => fetchBilling()}
          className="h-9 px-4 rounded-lg bg-red-650 hover:bg-red-750 text-white text-xs font-semibold transition-all cursor-pointer border-0"
        >
          Retry
        </button>
      </div>
    );
  }

  const bData = billing.data || ({} as any);
  const rawPlan = bData.plan;
  const paymentMethods = bData.paymentMethods || [];
  const invoices = bData.invoices || [];
  const findCanonicalKey = (planStr?: string) => {
    if (!planStr) return 'None';
    const lower = planStr.toLowerCase();
    if (lower.includes('team')) return 'Team';
    if (lower.includes('individual') || lower.includes('investor')) return 'Individual';
    if (lower.includes('vendor')) return 'Vendor Network';
    return 'None';
  };
  const subscriptionStatus = bData.subscriptionStatus || 'inactive';
  const canonicalKey = findCanonicalKey(rawPlan);
  const currentPlanId = canonicalKey;
  const currentPlanMeta = CANONICAL_PLACES[canonicalKey] || CANONICAL_PLACES['None'];
  const currentPriceNum = currentPlanMeta.priceNum;

  // Active status badge configuration
  let statusBadgeStyle = 'bg-slate-100 text-slate-650 border-slate-200';
  let statusDisplay = subscriptionStatus;
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    statusBadgeStyle = 'bg-[#6B8E6B]/15 text-[#557255] border-[#6B8E6B]/25';
  } else if (subscriptionStatus === 'past_due') {
    statusBadgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (subscriptionStatus === 'canceled') {
    statusBadgeStyle = 'bg-red-50 text-red-750 border-red-200';
  } else if (subscriptionStatus === 'cancellation_pending') {
    statusBadgeStyle = 'bg-amber-50 text-amber-750 border-amber-200';
    statusDisplay = 'Pending Cancellation';
  }

  // Properties limits matching the plan
  const propertiesUsed = 3;
  let propertiesLimit = 0;
  if (currentPlanId === 'Vendor Network') propertiesLimit = 1;
  else if (currentPlanId === 'Individual') propertiesLimit = 3;
  else if (currentPlanId === 'Team') propertiesLimit = 10;

  const gracePeriodDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* SECTION 1: CURRENT PLAN CARD */}
      <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-slate-900">{currentPlanMeta.label}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeStyle}`}>
                {statusDisplay}
              </span>
            </div>
            {subscriptionStatus === 'cancellation_pending' ? (
              <p className="text-sm text-amber-700 font-semibold leading-relaxed">
                Your subscription is cancelled. Access remains active through the grace period ending {gracePeriodDate}.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Current subscription plan. Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChangePlan(true)}
              className="h-10 px-4 py-2 rounded-lg border border-[#6B8E6B] text-[#557255] hover:bg-[#6B8E6B]/5 text-xs font-semibold cursor-pointer transition-colors bg-white"
            >
              Change Plan
            </button>
            <button
              onClick={async () => {
                try {
                  await openPortal();
                } catch (err: any) {
                  toast.error(err.message || 'Failed to open billing portal');
                }
              }}
              disabled={portalLoading}
              className="h-10 px-4 py-2 rounded-lg border border-slate-200 text-slate-750 hover:bg-slate-55 text-xs font-semibold cursor-pointer transition-colors bg-white disabled:opacity-50"
            >
              {portalLoading ? 'Loading...' : 'Customer Portal'}
            </button>
            {subscriptionStatus === 'active' && currentPlanId !== 'None' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="h-10 px-4 py-2 rounded-lg border border-red-200 text-red-650 hover:bg-red-50 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel Subscription
              </button>
            )}
            {subscriptionStatus === 'cancellation_pending' && (
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="h-10 px-4 py-2 rounded-lg bg-[#6B8E6B] hover:bg-[#557255] text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
              >
                {reactivating ? 'Reactivating...' : 'Reactivate Plan'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 4: USAGE SUMMARY */}
      {propertiesLimit > 0 && (
        <section className="bg-white border border-slate-100 rounded-xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
            <span>Workspace Property Cap</span>
            <span>{propertiesUsed} of {propertiesLimit} properties used this month</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#6B8E6B] rounded-full transition-all duration-500" 
              style={{ width: `${(propertiesUsed / propertiesLimit) * 100}%` }}
            />
          </div>
        </section>
      )}

      {/* SECTION 2: PAYMENT METHOD CARD */}
      <PaymentMethodCard
        paymentMethods={paymentMethods}
        onAddCardClick={() => setShowAddCard(true)}
        onSetDefault={handleSetDefault}
        onRemoveCard={handleRemoveCard}
      />

      {/* SECTION 3: BILLING HISTORY CARD */}
      <InvoiceTable
        invoices={invoices}
        onDownload={handleDownloadInvoice}
      />

      {/* MODALS */}
      <ChangePlanModal
        isOpen={showChangePlan}
        onClose={() => setShowChangePlan(false)}
        planCards={PLAN_CARDS}
        currentPlanId={currentPlanId}
        currentPriceNum={currentPriceNum}
        checkoutLoading={checkoutLoading}
        onPlanChange={handlePlanChange}
      />

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        isLoading={canceling}
      />

      <AddCardModal
        isOpen={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSubmit={handleAddCardSubmit}
      />

    </div>
  );
};
