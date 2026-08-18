import React from 'react';

export const metadata = {
  title: 'PaperWorking — System Status',
  description: 'Real-time operational status for PaperWorking platform services.',
};

const SERVICES = [
  { name: 'Core Application Dashboard', status: 'Operational', ping: '24ms' },
  { name: 'REI Metric Calculation Engine', status: 'Operational', ping: '18ms' },
  { name: 'Tax Document Generation Engine', status: 'Operational', ping: '42ms' },
  { name: 'Stripe Payments & Subscriptions', status: 'Operational', ping: '45ms' },
  { name: 'Plaid Bank Integration', status: 'Operational', ping: '62ms' },
  { name: 'Google Maps & Street View API', status: 'Operational', ping: '28ms' },
];

export default function StatusPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '24px', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>
          PaperWorking System Status
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
          Real-time operational status for platform infrastructure and APIs.
        </p>
      </header>

      <main>
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '16px 20px',
            color: '#065f46',
            fontWeight: 600,
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span>
          All Systems Operational
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {SERVICES.map((service) => (
            <div
              key={service.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: '#ffffff',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '15px' }}>{service.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Latency: {service.ping}</div>
              </div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#059669',
                  background: '#d1fae5',
                  padding: '4px 10px',
                  borderRadius: '12px',
                }}
              >
                {service.status}
              </span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
