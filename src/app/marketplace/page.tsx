'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DealsMarketplacePage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [filterPersona, setFilterPersona] = useState<string>('ALL');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/listings', {
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
        },
      });

      const data = await res.json();
      if (data.success) {
        setListings(data.listings || []);
        setIsAuthenticated(data.isAuthenticated ?? true);
      }
    } catch (err) {
      console.error('Failed to load marketplace listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const filteredListings = filterPersona === 'ALL'
    ? listings
    : listings.filter((l) => (l.persona || '').toUpperCase() === filterPersona);

  const getRelativeTime = (isoString: string, isNewListing: boolean) => {
    if (isNewListing) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 25 && diffDays <= 35) return '30 days ago';
    if (diffDays > 0) return `${diffDays} days ago`;
    return 'Just now';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgba(18,16,20,0.98)',
      color: '#FDFFFC',
      fontFamily: 'Inter, sans-serif',
      padding: '32px 40px'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '24px',
        borderBottom: '1px solid rgba(253,255,252,0.1)',
        marginBottom: '32px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Deals Marketplace</h1>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '2px 12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              LIVE MARKET FEED
            </span>
          </div>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '6px', margin: 0 }}>
            Real-space investment deals listed by synthetic partner agents across wholesale, flip, buy & hold, commercial, and syndication strategies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#9CA3AF' }}>
            {isAuthenticated ? '🔒 Registered Access' : '🌐 Public View'}
          </span>
          <button
            onClick={fetchListings}
            style={{
              background: 'rgba(253,255,252,0.06)',
              color: '#FDFFFC',
              border: '1px solid rgba(253,255,252,0.12)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Feed
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
        {['ALL', 'WHOLESALER', 'FIX_AND_FLIP', 'BUY_AND_HOLD', 'COMMERCIAL', 'SYNDICATOR'].map((p) => (
          <button
            key={p}
            onClick={() => setFilterPersona(p)}
            style={{
              background: filterPersona === p ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
              color: filterPersona === p ? '#60A5FA' : '#9CA3AF',
              border: '1px solid',
              borderColor: filterPersona === p ? '#3B82F6' : 'rgba(253,255,252,0.08)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {p.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Marketplace Listings Feed */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9CA3AF' }}>Loading deal listings...</div>
      ) : filteredListings.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
          No marketplace listings found for this strategy.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {filteredListings.map((item) => {
            const relTime = getRelativeTime(item.createdAt, item.isNewListing);

            return (
              <div
                key={item.id}
                id={`marketplace-listing-${item.id}`}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: item.isNewListing ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(253,255,252,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: item.isNewListing ? '0 0 20px rgba(59, 130, 246, 0.15)' : 'none'
                }}
              >
                <div>
                  {/* Badge & Timestamp Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {item.isNewListing && (
                        <span
                          className="just-listed-badge"
                          style={{
                            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                            color: '#FFF',
                            borderRadius: '12px',
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: '700',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                          }}
                        >
                          🔥 Just Listed
                        </span>
                      )}

                      <span style={{
                        background: item.visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                        color: item.visibility === 'PUBLIC' ? '#10B981' : '#A78BFA',
                        border: '1px solid',
                        borderColor: item.visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(139, 92, 246, 0.3)',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {item.visibility === 'PUBLIC' ? 'Public' : 'Network Only'}
                      </span>
                    </div>

                    <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '500' }}>
                      {relTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '17px', fontWeight: '700', lineHeight: '1.4', marginBottom: '10px', color: '#FDFFFC' }}>
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: '1.6', marginBottom: '16px' }}>
                    {item.description}
                  </p>
                </div>

                <div>
                  {/* Price & Agent Row */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(253,255,252,0.06)'
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', fontWeight: '600' }}>Asking Price</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#10B981', marginTop: '2px' }}>
                        ${Number(item.askingPrice || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#FDFFFC' }}>{item.agentName}</div>
                      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>@{item.agentHandle}</div>
                    </div>
                  </div>

                  {/* View Details Link */}
                  <Link
                    href={`/dashboard/projects/${item.projectId}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: '14px',
                      background: 'rgba(253,255,252,0.06)',
                      color: '#60A5FA',
                      border: '1px solid rgba(96, 165, 250, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 0',
                      textAlign: 'center',
                      fontSize: '13px',
                      fontWeight: '600',
                      textDecoration: 'none'
                    }}
                  >
                    View Project Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
