import React from 'react';

const activities = [
  {
    id: 1,
    type: 'deposit',
    title: 'Dividend payout',
    description: 'received for Nexus Alpha Plaza.',
    amount: '+$14,240.55',
    time: '12 MINUTES AGO',
    icon: (
      <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
    ),
    iconBg: 'bg-primary/10 border-primary/30'
  },
  {
    id: 2,
    type: 'report',
    title: 'Portfolio Report',
    description: 'for Q2 generated and synced to Insights.',
    time: '1 HOUR AGO',
    icon: (
      <span className="material-symbols-outlined text-on-surface-variant text-sm">description</span>
    ),
    iconBg: 'bg-surface-container-highest border-outline-variant'
  },
  {
    id: 3,
    type: 'revaluation',
    title: 'Asset Revaluation',
    description: 'complete for Liquid Venture Pool.',
    amount: '+8.2% Increase',
    amountColor: 'text-tertiary',
    time: '4 HOURS AGO',
    icon: (
      <span className="material-symbols-outlined text-tertiary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
    ),
    iconBg: 'bg-tertiary/10 border-tertiary/30'
  },
  {
    id: 4,
    type: 'security',
    title: 'Jane Cooper',
    description: 'accessed Due Diligence folder.',
    time: 'YESTERDAY, 4:15 PM',
    icon: (
      <span className="material-symbols-outlined text-on-surface-variant text-sm">security</span>
    ),
    iconBg: 'bg-surface-container-highest border-outline-variant'
  },
  {
    id: 5,
    type: 'capital_call',
    title: 'Green Energy Fund III',
    description: 'Capital call initiated.',
    amount: '$250,000.00 Pending',
    amountColor: 'text-on-surface-variant',
    time: 'JUL 14, 2023',
    icon: (
      <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
    ),
    iconBg: 'bg-primary/10 border-primary/30'
  }
];

export default function SystemActivityFeed() {
  return (
    <div className="w-full h-full border-l border-outline-variant bg-surface-container-low p-8 flex flex-col overflow-hidden rounded-2xl xl:rounded-l-none xl:rounded-r-2xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-headline-md text-headline-md text-on-surface">System activity</h3>
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">filter_list</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-4">
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${activity.iconBg}`}>
              {activity.icon}
            </div>
            <div className="space-y-1">
              <p className="text-body-sm text-on-surface leading-tight">
                {activity.id === 5 ? 'Capital call initiated for ' : ''}
                {activity.id === 2 ? 'Monthly ' : ''}
                <span className="font-bold">{activity.title}</span>
                {activity.id !== 5 && activity.id !== 2 ? ' ' : ''}
                {activity.id === 2 ? ' ' + activity.description : activity.id !== 5 ? activity.description : ''}
              </p>
              {activity.amount && (
                <div className={`jetbrains-mono text-[11px] ${activity.amountColor || 'text-primary'}`}>
                  {activity.amount}
                </div>
              )}
              <p className="text-[10px] text-outline">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 pt-6 border-t border-outline-variant">
        <button className="w-full py-3 rounded-lg border border-outline-variant hover:border-primary text-on-surface font-label-md transition-all flex items-center justify-center gap-2 group">
          <span>View Full Audit Log</span>
          <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
