'use client';

export type AdminActivityType = 'signup' | 'upgrade' | 'ticket' | 'churn' | 'payment' | 'audit';

export interface AdminActivityItem {
  id: string;
  type: AdminActivityType;
  message: string;
  timestamp: string;
}

const ICON_MAP: Record<AdminActivityType, string> = {
  signup: 'person_add',
  upgrade: 'arrow_circle_up',
  ticket: 'confirmation_number',
  churn: 'person_remove',
  payment: 'credit_card',
  audit: 'shield',
};

const COLOR_MAP: Record<AdminActivityType, string> = {
  signup: '#3f7d20',
  upgrade: '#3b82f6',
  ticket: '#f59e0b',
  churn: '#F06543',
  payment: '#F06543',
  audit: '#454955',
};

/** Port of PaperWorking main ActivityFeed. */
export default function ActivityFeed({ items }: { items: AdminActivityItem[] }) {
  return (
    <div
      className="p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <p
        className="mb-4 text-xs font-bold uppercase tracking-widest"
        style={{ color: 'var(--text-secondary)' }}
      >
        Recent Activity
      </p>

      <div className="space-y-0">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-3"
            style={{
              borderBottom: idx < items.length - 1 ? '1px solid var(--border-ui)' : undefined,
            }}
          >
            <span
              className="material-symbols-outlined mt-0.5 shrink-0 text-[18px]"
              style={{ color: COLOR_MAP[item.type] }}
              aria-hidden
            >
              {ICON_MAP[item.type]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
                {item.message}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {item.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
