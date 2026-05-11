'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search, X, Mail, Phone, Award, Building2, ExternalLink,
  ChevronRight, User, MapPin, Loader2, DollarSign,
  BedDouble, Bath, Maximize2,
} from 'lucide-react';
import { useAgentDirectory } from '@/hooks/useAgentDirectory';
import type { BridgeAgentResult } from '@/types/bridge';

/* ═══════════════════════════════════════════════════════════════
   Agent Directory — MLS Agent Search & Profile Viewer
   
   Data:  Bridge Interactive /api/bridge/agents
   Geo:   Google Places /api/places/geocode (office → map pin)
   Style: Antigravity v2 · FinTech-Sharp · Grayscale
   ═══════════════════════════════════════════════════════════════ */

function AgentCard({
  agent,
  onSelect,
}: {
  agent: BridgeAgentResult;
  onSelect: (key: string) => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(agent.memberKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(agent.memberKey);
        }
      }}
      className="group bg-[#FFFFFF] border border-[#A5A5A5]/50 rounded-xl p-5 cursor-pointer
                 hover:border-[#595959] hover:shadow-md transition-all duration-300
                 focus-visible:outline-2 focus-visible:outline-[#595959]"
      id={`agent-${agent.memberKey}`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-[#F2F2F2] border border-[#A5A5A5]/30
                        flex items-center justify-center flex-shrink-0 overflow-hidden">
          {agent.photoUrl ? (
            <img
              src={agent.photoUrl}
              alt={agent.name}
              className="w-full h-full object-cover rounded-full"
              loading="lazy"
            />
          ) : (
            <User className="w-5 h-5 text-[#7F7F7F]" aria-hidden="true" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#595959] tracking-tight truncate
                         group-hover:text-[#0d0d0d] transition-colors">
            {agent.name}
          </h3>

          {agent.officeName && (
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3 h-3 text-[#A5A5A5] flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-[#7F7F7F] truncate">{agent.officeName}</span>
            </div>
          )}

          {agent.license && (
            <div className="flex items-center gap-1.5 mt-1">
              <Award className="w-3 h-3 text-[#A5A5A5] flex-shrink-0" aria-hidden="true" />
              <span className="text-[10px] text-[#A5A5A5] font-mono tracking-wide">
                Lic. {agent.license}
              </span>
            </div>
          )}
        </div>

        <ChevronRight
          className="w-4 h-4 text-[#A5A5A5] group-hover:text-[#595959] transition-colors flex-shrink-0 mt-1"
          aria-hidden="true"
        />
      </div>

      {/* Contact Row */}
      {(agent.email || agent.phone) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#A5A5A5]/20">
          {agent.email && (
            <div className="flex items-center gap-1 text-xs text-[#7F7F7F] truncate">
              <Mail className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{agent.email}</span>
            </div>
          )}
          {agent.phone && (
            <div className="flex items-center gap-1 text-xs text-[#7F7F7F]">
              <Phone className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
              <span>{agent.phone}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/** Listing mini-card for agent's active listings */
function ListingMiniCard({ listing }: { listing: any }) {
  const thumb = listing.Media?.[0]?.MediaURL;
  return (
    <div className="bg-[#F2F2F2] border border-[#A5A5A5]/30 rounded-lg p-3 flex gap-3">
      <div className="w-16 h-16 rounded-md bg-[#A5A5A5]/20 flex-shrink-0 overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={listing.UnparsedAddress} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-4 h-4 text-[#A5A5A5]" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[#595959] truncate">{listing.UnparsedAddress}</p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-[#7F7F7F]">
          {listing.ListPrice && (
            <span className="flex items-center gap-0.5">
              <DollarSign className="w-2.5 h-2.5" />
              {Number(listing.ListPrice).toLocaleString()}
            </span>
          )}
          {listing.BedroomsTotal && (
            <span className="flex items-center gap-0.5">
              <BedDouble className="w-2.5 h-2.5" />
              {listing.BedroomsTotal}
            </span>
          )}
          {listing.BathroomsFull && (
            <span className="flex items-center gap-0.5">
              <Bath className="w-2.5 h-2.5" />
              {listing.BathroomsFull}
            </span>
          )}
          {listing.LivingArea && (
            <span className="flex items-center gap-0.5">
              <Maximize2 className="w-2.5 h-2.5" />
              {Number(listing.LivingArea).toLocaleString()} sqft
            </span>
          )}
        </div>
        {listing.StandardStatus && (
          <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-widest
                           bg-[#595959] text-white px-2 py-0.5 rounded">
            {listing.StandardStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function AgentProfilePanel({
  agent,
  loading,
  onClose,
}: {
  agent: (BridgeAgentResult & { listings?: any[] }) | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!agent && !loading) return null;

  return (
    <div className="bg-[#FFFFFF] border border-[#A5A5A5]/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#A5A5A5]/20">
        <h2 className="text-sm font-bold text-[#595959] tracking-tight">Agent Profile</h2>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-[#F2F2F2] flex items-center justify-center transition-colors"
          aria-label="Close profile"
        >
          <X className="w-4 h-4 text-[#7F7F7F]" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-[#A5A5A5] animate-spin" />
        </div>
      ) : agent ? (
        <div className="p-5 space-y-5">
          {/* Agent Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F2F2F2] border border-[#A5A5A5]/30
                            flex items-center justify-center overflow-hidden">
              {agent.photoUrl ? (
                <img src={agent.photoUrl} alt={agent.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-6 h-6 text-[#7F7F7F]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#595959] tracking-tight">{agent.name}</h3>
              {agent.officeName && (
                <p className="text-xs text-[#7F7F7F] mt-0.5">{agent.officeName}</p>
              )}
              {agent.license && (
                <p className="text-[10px] text-[#A5A5A5] font-mono mt-1">License: {agent.license}</p>
              )}
            </div>
          </div>

          {/* Contact Actions */}
          <div className="flex gap-2">
            {agent.email && (
              <a
                href={`mailto:${agent.email}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3
                           bg-[#595959] text-white text-xs font-bold rounded-lg
                           hover:bg-[#0d0d0d] transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> Email
              </a>
            )}
            {agent.phone && (
              <a
                href={`tel:${agent.phone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3
                           bg-[#F2F2F2] border border-[#A5A5A5] text-[#595959]
                           text-xs font-bold rounded-lg hover:bg-[#A5A5A5]/20 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" /> Call
              </a>
            )}
          </div>

          {/* Active Listings */}
          {agent.listings && agent.listings.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7F7F7F] mb-3">
                Active Listings ({agent.listings.length})
              </p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
                {agent.listings.map((l: any) => (
                  <ListingMiniCard key={l.ListingKey ?? l.ListingId} listing={l} />
                ))}
              </div>
            </div>
          )}

          {agent.listings && agent.listings.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-[#7F7F7F]">No active listings</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Main Component ─── */

export default function AgentDirectory() {
  const {
    agents, loading, error,
    selectedAgent, selectedAgentLoading,
    searchAgents, selectAgent, clearSelection,
  } = useAgentDirectory();

  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchAgents(value);
      }, 300);
    },
    [searchAgents]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <section
      className="bg-[#FFFFFF] border border-[#A5A5A5]/50 rounded-xl overflow-hidden"
      aria-label="Agent Directory"
      id="agent-directory"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#A5A5A5]/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#F2F2F2] flex items-center justify-center">
              <User className="w-4 h-4 text-[#7F7F7F]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#595959] tracking-tight">Agent Directory</h2>
              <p className="text-[10px] text-[#A5A5A5]">Search MLS-licensed agents</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A5A5A5]" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search agents by name…"
            className="w-full pl-9 pr-9 py-2.5 bg-[#F2F2F2] border border-[#A5A5A5]/30 rounded-lg
                       text-sm text-[#595959] placeholder:text-[#A5A5A5]
                       focus:outline-none focus:ring-1 focus:ring-[#595959] focus:border-[#595959]
                       transition-colors"
            id="agent-search-input"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                searchAgents('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A5A5A5] hover:text-[#595959]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row">
        {/* Agent List */}
        <div className="flex-1 p-4 max-h-[520px] overflow-y-auto no-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-[#A5A5A5] animate-spin" />
              <span className="text-xs text-[#7F7F7F] ml-2">Searching…</span>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-xs text-[#A5A5A5]">{error}</p>
            </div>
          )}

          {!loading && !error && agents.length === 0 && query.length >= 2 && (
            <div className="text-center py-12">
              <User className="w-8 h-8 text-[#A5A5A5] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#595959]">No agents found</p>
              <p className="text-xs text-[#7F7F7F] mt-1">Try a different name or check spelling</p>
            </div>
          )}

          {!loading && !error && agents.length === 0 && query.length < 2 && (
            <div className="text-center py-12">
              <Search className="w-8 h-8 text-[#A5A5A5] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#595959]">Find your agent</p>
              <p className="text-xs text-[#7F7F7F] mt-1 max-w-[200px] mx-auto leading-relaxed">
                Search by name to find MLS-licensed real estate agents and view their listings
              </p>
            </div>
          )}

          {agents.length > 0 && (
            <div className="space-y-2">
              {agents.map((agent) => (
                <AgentCard key={agent.memberKey} agent={agent} onSelect={selectAgent} />
              ))}
            </div>
          )}
        </div>

        {/* Profile Panel (sidebar on lg+) */}
        {(selectedAgent || selectedAgentLoading) && (
          <div className="lg:w-[360px] lg:border-l border-t lg:border-t-0 border-[#A5A5A5]/20">
            <AgentProfilePanel
              agent={selectedAgent}
              loading={selectedAgentLoading}
              onClose={clearSelection}
            />
          </div>
        )}
      </div>
    </section>
  );
}
