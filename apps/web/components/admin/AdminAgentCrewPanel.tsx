'use client';

import { useCallback, useEffect, useState } from 'react';

interface SyntheticAgent {
  id: string;
  name: string;
  email: string;
  persona: string;
  handle: string;
  stats: { projectsCount: number; listingsCount: number; messagesCount: number };
}

interface AgentDetail extends SyntheticAgent {
  bio?: string;
  projects?: string[];
  lastActiveAt?: string;
}

export default function AdminAgentCrewPanel() {
  const [agents, setAgents] = useState<SyntheticAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/agent-crew', {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = (await response.json()) as { agents?: SyntheticAgent[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Failed to load agent crew');
      const list = body.agents ?? [];
      setAgents(list);
      setSelectedId((current) => current ?? list[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    async function loadDetail() {
      const response = await fetch(`/api/admin/agent-crew/${selectedId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = (await response.json()) as { agent?: AgentDetail; error?: string };
      if (!cancelled && response.ok) setDetail(body.agent ?? null);
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const impersonate = async (agentId: string) => {
    setActionMessage(null);
    const response = await fetch(`/api/admin/agent-crew/${agentId}/impersonate`, {
      method: 'POST',
      credentials: 'include',
    });
    const body = (await response.json()) as { redirectUrl?: string; error?: string };
    if (!response.ok) {
      setError(body.error ?? 'Impersonation failed');
      return;
    }
    if (body.redirectUrl) window.location.href = body.redirectUrl;
  };

  const removeAgent = async (agentId: string) => {
    setActionMessage(null);
    const response = await fetch(`/api/admin/agent-crew/${agentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const body = (await response.json()) as { message?: string; error?: string };
    if (!response.ok) {
      setError(body.error ?? 'Delete failed');
      return;
    }
    setActionMessage(body.message ?? 'Agent deleted');
    setSelectedId(null);
    setDetail(null);
    await loadAgents();
  };

  if (loading) {
    return (
      <div className="w-full py-4 text-sm text-black/55">
        Loading agent crew…
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <section>
        <h2 className="text-2xl font-extralight tracking-tight sm:text-3xl">Synthetic agent crew</h2>
        <p className="mt-2 text-sm text-black/60">
          `handleAdminAgentCrewGet`, detail, impersonate, and delete adapters.
        </p>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      ) : null}
      {actionMessage ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          {actionMessage}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedId(agent.id)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                selectedId === agent.id
                  ? 'border-black bg-black text-white'
                  : 'border-black/10 bg-white hover:border-black/20'
              }`}
            >
              <p className="font-medium">{agent.name}</p>
              <p className="text-xs opacity-70">{agent.handle}</p>
            </button>
          ))}
        </aside>

        {detail ? (
          <article className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold">{detail.name}</h3>
                <p className="mt-1 text-sm text-black/60">{detail.email}</p>
                <p className="mt-2 text-sm capitalize">Persona: {detail.persona}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => impersonate(detail.id)}
                  className="rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5"
                >
                  Impersonate
                </button>
                <button
                  type="button"
                  onClick={() => removeAgent(detail.id)}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {detail.bio ? <p className="mt-4 text-sm text-black/70">{detail.bio}</p> : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Projects', value: detail.stats.projectsCount },
                { label: 'Listings', value: detail.stats.listingsCount },
                { label: 'Messages', value: detail.stats.messagesCount },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-black/8 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.06em] text-black/45">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          </article>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/55">
            Select an agent to inspect details.
          </div>
        )}
      </section>
    </div>
  );
}
