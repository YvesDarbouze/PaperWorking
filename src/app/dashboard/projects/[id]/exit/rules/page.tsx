'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  Zap,
  Plus,
  Sparkles,
  Trash2,
  Play,
  RefreshCw,
} from 'lucide-react';
import { RuleBuilderModal } from '@/components/rules/RuleBuilderModal';

interface RuleItem {
  id: string;
  name: string;
  ruleType: string;
  isActive: boolean;
  priority: number;
  matchCount: number;
  lastMatchedAt?: string | null;
  conditions: any[];
  action: {
    category: string;
    autoApprove: boolean;
  };
}

interface SmartSuggestionItem {
  suggestedRuleName: string;
  ruleType: string;
  conditions: any[];
  action: {
    category: string;
    autoApprove: boolean;
  };
  historicalMatchCount: number;
  explanation: string;
}

async function getIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export default function RulesManagementPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [rules, setRules] = useState<RuleItem[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applyingRuleId, setApplyingRuleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [rulesRes, suggRes] = await Promise.all([
        fetch(`/api/rules/project/${projectId}`, { headers }),
        fetch(`/api/rules/project/${projectId}/suggestions`, { headers }),
      ]);

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }

      if (suggRes.ok) {
        const data = await suggRes.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('[RulesManagement] Error loading rules:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleActive = async (ruleId: string, currentActive: boolean) => {
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch(`/api/rules/${ruleId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !currentActive }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to toggle rule active state:', err);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE',
        headers,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const handleApplyRule = async (ruleId: string) => {
    setApplyingRuleId(ruleId);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(`/api/rules/${ruleId}/apply`, {
        method: 'POST',
        headers,
      });
      await loadData();
    } finally {
      setApplyingRuleId(null);
    }
  };

  const handleCreateFromSuggestion = async (sugg: SmartSuggestionItem) => {
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await fetch('/api/rules', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectId,
          name: sugg.suggestedRuleName,
          ruleType: sugg.ruleType,
          conditions: sugg.conditions,
          action: sugg.action,
        }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to create rule from suggestion:', err);
    }
  };

  return (
    <div className="min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} style={{ color: '#10B981' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#10B981' }}>
              Exit Phase · Automation Layer
            </span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: '#FDFFFC' }}>Automation Rules</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgba(253,255,252,0.5)' }}>
            Manage auto-categorization and approval rules for bank activity.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg"
        >
          <Plus size={15} /> Create Rule
        </button>
      </div>

      {/* Smart Suggestions Section */}
      {suggestions.length > 0 && (
        <div
          className="p-5 rounded-2xl flex flex-col gap-4"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.20)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Smart Rule Suggestions</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-emerald-900/40 bg-slate-950/80 flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">{s.suggestedRuleName}</span>
                  <p className="text-[11px] text-slate-400">{s.explanation}</p>
                </div>
                <button
                  onClick={() => void handleCreateFromSuggestion(s)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/50 transition-all"
                >
                  <Plus size={13} /> Accept &amp; Create
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'rgba(253,255,252,0.03)', border: '1px solid rgba(253,255,252,0.07)' }}
      >
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-emerald-500" />
            <span className="text-xs text-slate-400">Loading rules…</span>
          </div>
        )}

        {!loading && rules.length === 0 && (
          <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
            <Zap size={32} className="text-slate-500" />
            <h3 className="text-base font-bold text-white">No active rules configured</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Create rules to auto-categorize recurring rent payments, maintenance expenses, or loan activity.
            </p>
          </div>
        )}

        {!loading && rules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className="uppercase tracking-widest font-bold text-[10px]"
                style={{
                  background: 'rgba(253,255,252,0.02)',
                  borderBottom: '1px solid rgba(253,255,252,0.06)',
                  color: 'rgba(253,255,252,0.35)',
                }}
              >
                <tr>
                  <th className="p-3 w-12 text-center">Status</th>
                  <th className="p-3">Rule Name</th>
                  <th className="p-3">Target Category</th>
                  <th className="p-3">Auto-Approve</th>
                  <th className="p-3 text-right">Match Count</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid rgba(253,255,252,0.04)' }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={() => void handleToggleActive(r.id, r.isActive)}
                        className="rounded border-slate-700 bg-slate-900 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-white">{r.name}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-900">
                        {r.action?.category || 'RENT_INCOME'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      {r.action?.autoApprove ? '⚡ Yes' : '⏸️ Manual Review'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {r.matchCount}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => void handleApplyRule(r.id)}
                          disabled={applyingRuleId === r.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"
                          title="Run rule now"
                        >
                          <Play size={13} />
                        </button>
                        <button
                          onClick={() => void handleDeleteRule(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                          title="Delete rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RuleBuilderModal
        projectId={projectId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRuleCreated={loadData}
      />
    </div>
  );
}
