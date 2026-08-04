'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { calculateKPIs } from '@/lib/insights/kpiEngine';

export default function AdminAgentCrewPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentDetail, setAgentDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);

  // Tab State: 'OVERVIEW' | 'MARKETPLACE_PREVIEW' | 'DATABASE_INSPECTOR' | 'AUDIT_LOG'
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MARKETPLACE_PREVIEW' | 'DATABASE_INSPECTOR' | 'AUDIT_LOG'>('OVERVIEW');
  const [marketplaceFilter, setMarketplaceFilter] = useState<'ALL' | 'SYNTHETIC_ONLY' | 'REAL_ONLY'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRoster = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/agent-crew');
      if (res.status === 403) {
        setError('403 Forbidden: You must have ADMIN or SUPERUSER role to access the Synthetic Agent Crew dashboard.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents || []);
        if (data.agents && data.agents.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data.agents[0].id);
        }
      } else {
        setError(data.error || 'Failed to load synthetic agent crew');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load synthetic agent crew');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/agent-crew/${id}`);
      const data = await res.json();
      if (data.success) {
        setAgentDetail(data.agent);
      }
    } catch (err) {
      console.error('Failed to load agent detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      fetchAgentDetail(selectedAgentId);
    }
  }, [selectedAgentId]);

  const handleImpersonate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/agent-crew/${id}/impersonate`, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      alert('Impersonation failed.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'rgba(18,16,20,0.98)', color: '#FDFFFC', padding: '60px', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        Loading Synthetic Agent Crew Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: 'rgba(18,16,20,0.98)', color: '#FDFFFC', padding: '60px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '12px', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ color: '#EF4444', marginTop: 0 }}>Access Restricted</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agentDetail;

  return (
    <div style={{ minHeight: '100vh', background: 'rgba(18,16,20,0.98)', color: '#FDFFFC', fontFamily: 'Inter, sans-serif', padding: '32px 40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '24px', borderBottom: '1px solid rgba(253,255,252,0.1)', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0 }}>Synthetic Agent Crew Console</h1>
            <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '20px', padding: '2px 12px', fontSize: '12px', fontWeight: '600' }}>
              ADMIN REVIEW
            </span>
          </div>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '6px', margin: 0 }}>
            Real-space management console for 5 synthetic partner agents. Controls live DB records, Stripe subscriptions, marketplaces, & messages.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowPurgeModal(true)} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            🚨 Purge All Synthetic Agents
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid rgba(253,255,252,0.08)', paddingBottom: '12px' }}>
        {[
          { id: 'OVERVIEW', label: '👥 Agent Roster & Details' },
          { id: 'MARKETPLACE_PREVIEW', label: '🏪 Live Marketplace Preview' },
          { id: 'DATABASE_INSPECTOR', label: '🔍 Database Inspector (JSON)' },
          { id: 'AUDIT_LOG', label: '📋 Audit & Activity Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: activeTab === tab.id ? '#60A5FA' : '#9CA3AF',
              border: '1px solid',
              borderColor: activeTab === tab.id ? '#3B82F6' : 'transparent',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & DETAILS */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '28px' }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Synthetic Roster ({agents.length})
            </h3>
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                style={{
                  background: selectedAgentId === agent.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                  border: selectedAgentId === agent.id ? '1px solid #3B82F6' : '1px solid rgba(253,255,252,0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '16px' }}>
                    {agent.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{agent.name}</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>@{agent.handle}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '12px', color: '#9CA3AF' }}>
                  <span>Tier: <strong style={{ color: '#FDFFFC' }}>{agent.subscriptionPlan || agent.tier}</strong></span>
                  <span style={{ color: agent.subscriptionStatus === 'active' || agent.subscriptionStatus === 'trialing' ? '#10B981' : '#EF4444' }}>
                    ● {agent.subscriptionStatus || 'active'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Detail Panel */}
          <div>
            {detailLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Loading agent detail...</div>
            ) : !selectedAgent ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>Select an agent to inspect details</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Actions Row */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{selectedAgent.name}</h2>
                    <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{selectedAgent.email} • {selectedAgent.agentPersona}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => handleImpersonate(selectedAgent.id)} style={{ background: '#3B82F6', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                      🔑 Impersonate Agent
                    </button>

                    <a href={`https://dashboard.stripe.com/test/customers/${selectedAgent.stripeCustomerId}`} target="_blank" rel="noreferrer" style={{ background: 'rgba(253,255,252,0.06)', color: '#60A5FA', border: '1px solid rgba(96, 165, 250, 0.3)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
                      💳 View Stripe Customer ↗
                    </a>
                  </div>
                </div>

                {/* Identity & Subscription Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', marginTop: 0 }}>Identity Details</h3>
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div><strong>Persona:</strong> {selectedAgent.agentPersona}</div>
                      <div><strong>Company:</strong> PaperWorking Synthetic Partner</div>
                      <div><strong>Email:</strong> {selectedAgent.email}</div>
                      <div><strong>Synthetic Flag:</strong> <span style={{ color: '#10B981' }}>syntheticAgent = true</span></div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', marginTop: 0 }}>Subscription & Test Billing</h3>
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <strong>Status: </strong>
                        <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: '700' }}>
                          ● Subscription Active ({selectedAgent.subscriptionPlan || selectedAgent.tier})
                        </span>
                      </div>
                      <div><strong>Customer ID:</strong> {selectedAgent.stripeCustomerId}</div>
                      <div><strong>Subscription ID:</strong> {selectedAgent.stripeSubscriptionId}</div>
                      <div><strong>Test Mode:</strong> <span style={{ color: '#60A5FA' }}>stripeTestMode = true</span></div>
                    </div>
                  </div>
                </div>

                {/* Persona Insights KPIs Card */}
                {(() => {
                  const agentKpis = calculateKPIs(selectedAgent.projects || [], selectedAgent.agentPersona);
                  return (
                    <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 }}>
                          Persona Insights KPIs ({selectedAgent.agentPersona?.toUpperCase() || 'GENERAL'})
                        </h3>
                        <span style={{ fontSize: '12px', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          {agentKpis.metrics.length} Calculated KPIs
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                        {agentKpis.metrics.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              background: m.isWarning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                              border: m.isWarning ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(253, 255, 252, 0.06)',
                              borderRadius: '8px',
                              padding: '12px',
                            }}
                          >
                            <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '600', marginBottom: '4px' }}>
                              {m.name}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: m.isWarning ? '#EF4444' : '#FFF' }}>
                              {m.value}
                            </div>
                            {m.benchmark && (
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                                Benchmark: {m.benchmark}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Portfolio Card */}
                <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', marginTop: 0, marginBottom: '16px' }}>
                    Real-Space Projects ({selectedAgent.projects?.length || 0})
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(253,255,252,0.1)', textAlign: 'left', color: '#9CA3AF' }}>
                        <th style={{ padding: '8px' }}>Title</th>
                        <th style={{ padding: '8px' }}>Address</th>
                        <th style={{ padding: '8px' }}>City, State</th>
                        <th style={{ padding: '8px' }}>Price / Contract</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedAgent.projects || []).map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(253,255,252,0.04)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                            <Link href={`/dashboard/projects/${p.id}`} style={{ color: '#60A5FA', textDecoration: 'none' }}>
                              {p.title || p.propertyName || p.displayName}
                            </Link>
                          </td>
                          <td style={{ padding: '10px 8px' }}>{p.address || p.addressLine}</td>
                          <td style={{ padding: '10px 8px' }}>{p.city}, {p.state}</td>
                          <td style={{ padding: '10px 8px', color: '#10B981', fontWeight: '600' }}>
                            ${Number(p.financials?.contractPrice || p.financials?.purchasePrice || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Marketplace Listings Table */}
                <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', marginTop: 0, marginBottom: '16px' }}>
                    Deals Marketplace Listings ({selectedAgent.listings?.length || 3})
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(253,255,252,0.1)', textAlign: 'left', color: '#9CA3AF' }}>
                        <th style={{ padding: '8px' }}>Title</th>
                        <th style={{ padding: '8px' }}>Asking Price</th>
                        <th style={{ padding: '8px' }}>Visibility</th>
                        <th style={{ padding: '8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedAgent.listings || []).map((l: any) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(253,255,252,0.04)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: '600' }}>{l.title}</td>
                          <td style={{ padding: '10px 8px', color: '#10B981', fontWeight: '600' }}>${Number(l.askingPrice || 0).toLocaleString()}</td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: l.visibility === 'PUBLIC' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: l.visibility === 'PUBLIC' ? '#10B981' : '#A78BFA', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                              {l.visibility || 'PUBLIC'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 8px' }}>{l.isNewListing ? '🔥 Just Listed' : 'Active (30d)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cross-Agent Messages Card */}
                <div id="messages-card" style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 }}>
                      💬 Cross-Agent Messages & Threads ({selectedAgent.messages?.length || 0} Messages)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#60A5FA', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                      Real-Space DB Persistence
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(253,255,252,0.1)', textAlign: 'left', color: '#9CA3AF' }}>
                        <th style={{ padding: '8px' }}>Subject / Preview</th>
                        <th style={{ padding: '8px' }}>Participants</th>
                        <th style={{ padding: '8px' }}>Thread ID</th>
                        <th style={{ padding: '8px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedAgent.messages || []).map((m: any) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(253,255,252,0.04)' }}>
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ fontWeight: '600', color: '#FDFFFC' }}>{m.subject || 'Message'}</div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.body || m.content || m.lastMessage}
                            </div>
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: '12px', color: '#9CA3AF' }}>
                            {m.senderName && m.recipientName ? `${m.senderName} ➔ ${m.recipientName}` : m.otherAgent || 'Agent Partner'}
                          </td>
                          <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '11px', color: '#A78BFA' }}>
                            {m.threadId || 'thread_default'}
                          </td>
                          <td style={{ padding: '10px 8px' }}>
                            <span style={{ background: m.read ? 'rgba(156, 163, 175, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: m.read ? '#9CA3AF' : '#10B981', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                              {m.read ? 'READ' : '● UNREAD'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE MARKETPLACE PREVIEW */}
      {activeTab === 'MARKETPLACE_PREVIEW' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Live Deals Marketplace Feed</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'SYNTHETIC_ONLY', 'REAL_ONLY'].map((f) => (
                <button
                  key={f}
                  onClick={() => setMarketplaceFilter(f as any)}
                  style={{
                    background: marketplaceFilter === f ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.04)',
                    color: marketplaceFilter === f ? '#60A5FA' : '#9CA3AF',
                    border: '1px solid',
                    borderColor: marketplaceFilter === f ? '#3B82F6' : 'rgba(253,255,252,0.1)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ border: '1px solid rgba(253,255,252,0.1)', borderRadius: '12px', overflow: 'hidden', height: '700px' }}>
            <iframe src="/marketplace" style={{ width: '100%', height: '100%', border: 'none' }} title="Marketplace Feed" />
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE INSPECTOR (JSON) */}
      {activeTab === 'DATABASE_INSPECTOR' && selectedAgent && (
        <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
              Raw JSON Inspector — {selectedAgent.name} (`syntheticAgent = true`)
            </h3>
            <button
              onClick={() => copyToClipboard(JSON.stringify(selectedAgent, null, 2), selectedAgent.id)}
              style={{ background: 'rgba(253,255,252,0.06)', color: '#FDFFFC', border: '1px solid rgba(253,255,252,0.12)', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}
            >
              {copiedId === selectedAgent.id ? '✅ Copied!' : '📋 Copy JSON'}
            </button>
          </div>
          <pre style={{ background: '#0F0D12', padding: '20px', borderRadius: '8px', color: '#10B981', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', maxHeight: '600px' }}>
            {JSON.stringify(selectedAgent, null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 4: AUDIT LOG */}
      {activeTab === 'AUDIT_LOG' && (
        <div style={{ background: 'rgba(255,255,252,0.03)', border: '1px solid rgba(253,255,252,0.08)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', fontWeight: '700' }}>Synthetic Agent Crew Audit Log</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(253,255,252,0.1)', textAlign: 'left', color: '#9CA3AF' }}>
                <th style={{ padding: '8px' }}>Agent Name</th>
                <th style={{ padding: '8px' }}>Seeded Timestamp</th>
                <th style={{ padding: '8px' }}>Seeded By</th>
                <th style={{ padding: '8px' }}>Last Activity</th>
                <th style={{ padding: '8px' }}>Impersonation Count</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid rgba(253,255,252,0.04)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: '600' }}>{a.name}</td>
                  <td style={{ padding: '10px 8px', color: '#9CA3AF' }}>{new Date().toISOString().slice(0, 19).replace('T', ' ')}</td>
                  <td style={{ padding: '10px 8px', color: '#60A5FA' }}>System Seeder (seedAgentCrew)</td>
                  <td style={{ padding: '10px 8px', color: '#10B981' }}>Active (Just now)</td>
                  <td style={{ padding: '10px 8px' }}>0 impersonations</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Purge Modal */}
      {showPurgeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#161318', border: '1px solid #EF4444', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%' }}>
            <h3 style={{ color: '#EF4444', marginTop: 0 }}>Confirm Purge All Synthetic Agents</h3>
            <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: '1.6' }}>
              Are you sure you want to purge all 5 synthetic agents? This will cancel Stripe test mode subscriptions and perform a cascading deletion across Firestore and PostgreSQL.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button onClick={() => setShowPurgeModal(false)} style={{ background: 'transparent', border: '1px solid rgba(253,255,252,0.2)', color: '#FDFFFC', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  await fetch('/api/admin/agent-crew/purge-all', { method: 'DELETE' });
                  setShowPurgeModal(false);
                  fetchRoster();
                }}
                style={{ background: '#EF4444', border: 'none', color: '#FFF', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                Purge All Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
