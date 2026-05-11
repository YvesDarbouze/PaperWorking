'use client';

import { useState, useCallback, useRef } from 'react';
import type { BridgeAgentResult } from '@/types/bridge';

interface AgentDirectoryState {
  agents: BridgeAgentResult[];
  loading: boolean;
  error: string | null;
  selectedAgent: (BridgeAgentResult & { listings?: any[] }) | null;
  selectedAgentLoading: boolean;
}

/**
 * Hook for the Agent Directory — handles search, profile fetch, and listing lookups.
 */
export function useAgentDirectory() {
  const [state, setState] = useState<AgentDirectoryState>({
    agents: [],
    loading: false,
    error: null,
    selectedAgent: null,
    selectedAgentLoading: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const searchAgents = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setState(prev => ({ ...prev, agents: [], error: null }));
      return;
    }

    // Cancel inflight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/bridge/agents?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();

      if (data.unavailable) {
        setState(prev => ({
          ...prev,
          loading: false,
          agents: [],
          error: 'Agent directory is temporarily unavailable.',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        agents: data.results ?? [],
      }));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to search agents.',
      }));
    }
  }, []);

  const selectAgent = useCallback(async (memberKey: string) => {
    setState(prev => ({ ...prev, selectedAgentLoading: true }));

    try {
      const res = await fetch(
        `/api/bridge/agents?key=${encodeURIComponent(memberKey)}&listings=true`
      );

      if (!res.ok) throw new Error('Fetch failed');

      const data = await res.json();
      const agent = data.agent;
      const listings = data.listings ?? [];

      setState(prev => ({
        ...prev,
        selectedAgentLoading: false,
        selectedAgent: {
          memberKey: agent.MemberKey ?? memberKey,
          name: agent.MemberFullName ?? `${agent.MemberFirstName ?? ''} ${agent.MemberLastName ?? ''}`.trim(),
          email: agent.MemberEmail ?? null,
          phone: agent.MemberDirectPhone ?? agent.MemberMobilePhone ?? null,
          license: agent.MemberStateLicense ?? null,
          officeName: agent.OfficeName ?? null,
          photoUrl: agent.Media?.[0]?.MediaURL ?? null,
          listings,
        },
      }));
    } catch {
      setState(prev => ({
        ...prev,
        selectedAgentLoading: false,
        selectedAgent: null,
      }));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setState(prev => ({ ...prev, selectedAgent: null }));
  }, []);

  return {
    ...state,
    searchAgents,
    selectAgent,
    clearSelection,
  };
}
