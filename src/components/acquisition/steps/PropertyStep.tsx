"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchPropertyEnrichment(projectId: string, idToken: string) {
  const res = await fetch(`/api/reil/projects/${projectId}/property`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Property fetch failed: ${res.status}`);
  return res.json();
}

async function getProjectFacts(projectId: string, idToken: string) {
  const res = await fetch(`/api/reil/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`Project fetch failed: ${res.status}`);
  const data = await res.json();
  return { facts: data.propertyFacts, comps: data.comps ?? [] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCents(cents: number | bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  if (n >= 100_000_00) return `$${(n / 100_000_00).toFixed(1)}M`;
  if (n >= 1_000_00)   return `$${(n / 1_000_00).toFixed(0)}K`;
  return `$${(n / 100).toLocaleString()}`;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SkeletonBox({ w = "100%", h = "20px" }: { w?: string; h?: string }) {
  return (
    <div
      className="rounded-lg animate-pulse"
      style={{ width: w, height: h, background: "rgba(255,255,255,0.06)" }}
    />
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PropertyStep({ onNext }: { onNext: () => void }) {
  const { projectId, address, setStepDone } = useAcquisitionWizard();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Initial load — get existing persisted facts (may be null on first visit)
  const { data, isLoading, isError, error, failureCount } = useQuery({
    queryKey: ["property-facts", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Not ready");
      return getProjectFacts(projectId, token);
    },
    enabled:    !!projectId && !!user,
    staleTime:  0,
    retry:      3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // exp backoff, cap 8s
  });

  // Enrich mutation — calls POST /api/reil/projects/:id/property
  const enrichMutation = useMutation({
    mutationFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Not ready");
      return fetchPropertyEnrichment(projectId, token);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["property-facts", projectId] });
      setStepDone("property");
    },
    // 2 automatic retries with backoff on mutation failures
    retry:      2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
  });

  // Auto-fetch on first visit if no facts exist yet
  const hasAutoFetched = data?.facts != null;
  const shouldAutoFetch = !isLoading && !hasAutoFetched && !!projectId && !enrichMutation.isPending && !enrichMutation.isError;

  // Trigger once (side-effect query)
  const hasTriggedAutoFetch = useQuery({
    queryKey: ["auto-enrich-trigger", projectId],
    queryFn:  () => { enrichMutation.mutate(); return null; },
    enabled:  shouldAutoFetch,
    staleTime: Infinity,
    gcTime: 0,
  });
  void hasTriggedAutoFetch;

  const facts = data?.facts;
  const comps = data?.comps ?? [];
  const loading = isLoading || enrichMutation.isPending;

  return (
    <div className="flex flex-col gap-8 w-full max-w-[720px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ color: "rgba(218,228,236,0.95)", letterSpacing: "-0.02em" }}
          >
            Property Details
          </h2>
          <p className="text-sm" style={{ color: "rgba(218,228,236,0.4)" }}>
            {address.formattedAddress ?? "Selected property"}
          </p>
        </div>
        <button
          onClick={() => enrichMutation.mutate()}
          disabled={enrichMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150"
          style={{
            background: "rgba(87,241,219,0.08)",
            border: "1px solid rgba(87,241,219,0.18)",
            color: "#57f1db",
            opacity: enrichMutation.isPending ? 0.5 : 1,
          }}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
            refresh
          </span>
          {enrichMutation.isPending ? "Fetching…" : "Refresh data"}
        </button>
      </div>

      {/* Error state */}
      {(isError || enrichMutation.isError) && !loading && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }}>error</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px]" style={{ color: "rgba(218,228,236,0.7)" }}>
              {(enrichMutation.error as Error)?.message ?? (error as Error)?.message ?? "Failed to load property data."}
            </p>
            {failureCount > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(218,228,236,0.35)" }}>
                Retried {failureCount} time{failureCount !== 1 ? "s" : ""}. Check your connection.
              </p>
            )}
          </div>
          <button
            onClick={() => enrichMutation.mutate()}
            className="flex-shrink-0 text-[12px] font-semibold hover:opacity-70"
            style={{ color: "#57f1db" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Photo */}
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: "220px", background: "rgba(20,29,35,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {loading ? (
          <div className="w-full h-full animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
        ) : facts?.photoUrl ? (
          <img
            src={facts.photoUrl}
            alt="Property"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl" style={{ color: "rgba(218,228,236,0.15)" }}>
              home
            </span>
          </div>
        )}
      </div>

      {/* Facts grid */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.08em" }}>
          Property Facts
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Beds",         value: facts?.beds   != null ? `${facts.beds} bd`        : null,          icon: "bed"            },
            { label: "Baths",        value: facts?.baths  != null ? `${facts.baths} ba`        : null,          icon: "bathroom"       },
            { label: "Sq Ft",        value: facts?.sqft   != null ? `${facts.sqft.toLocaleString()} sqft` : null, icon: "square_foot"   },
            { label: "Year Built",   value: facts?.yearBuilt != null ? `${facts.yearBuilt}` : null,             icon: "calendar_today" },
            { label: "Lot",          value: facts?.lotSqft != null ? `${facts.lotSqft.toLocaleString()} sqft` : null, icon: "landscape" },
            { label: "Type",         value: facts?.propertyType ?? null,                                        icon: "home_work"      },
            { label: "List Price",   value: fmtCents(facts?.listPriceCents),                                    icon: "sell"           },
            { label: "Est. Rent",    value: fmtCents(facts?.estRentCents) + (facts?.estRentCents ? "/mo" : ""), icon: "payments"       },
            { label: "Last Sold",    value: fmtCents(facts?.lastSoldPriceCents),                                icon: "paid"           },
            { label: "Sold Date",    value: fmtDate(facts?.lastSoldDate),                                       icon: "event"          },
          ].map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{
                background: "rgba(20,29,35,0.6)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {loading ? (
                <>
                  <SkeletonBox h="10px" w="60%" />
                  <SkeletonBox h="16px" w="80%" />
                </>
              ) : (
                <>
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(218,228,236,0.35)", letterSpacing: "0.07em" }}
                  >
                    {label}
                  </span>
                  <span className="text-[15px] font-semibold" style={{ color: value ? "rgba(218,228,236,0.9)" : "rgba(218,228,236,0.2)" }}>
                    {value ?? "—"}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comps */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.08em" }}>
          Sold Comparables
        </h3>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(14,22,28,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-6 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(218,228,236,0.3)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="col-span-2">Address</span>
            <span className="text-right">Price</span>
            <span className="text-right">Sold</span>
            <span className="text-right">Beds/Ba</span>
            <span className="text-right">Dist.</span>
          </div>

          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 px-4 py-3 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="col-span-2"><SkeletonBox h="12px" /></div>
                  <SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" />
                </div>
              ))
            : comps.length === 0
            ? (
                <div className="py-8 text-center">
                  <p className="text-[12px]" style={{ color: "rgba(218,228,236,0.25)" }}>No comps available.</p>
                </div>
              )
            : comps.map((c: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-6 px-4 py-3 text-[13px]"
                  style={{
                    borderBottom: i < comps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    color: "rgba(218,228,236,0.7)",
                  }}
                >
                  <span className="col-span-2 truncate">{c.addressLine}</span>
                  <span className="text-right font-semibold" style={{ color: "rgba(218,228,236,0.9)" }}>
                    {fmtCents(c.soldPriceCents)}
                  </span>
                  <span className="text-right">{fmtDate(c.soldDate)}</span>
                  <span className="text-right">{c.beds ?? "—"} / {c.baths ?? "—"}</span>
                  <span className="text-right">{c.distanceMiles != null ? `${c.distanceMiles} mi` : "—"}</span>
                </div>
              ))
          }
        </div>
        {facts?.sourceProvider && (
          <p className="text-[10px] mt-2 text-right" style={{ color: "rgba(218,228,236,0.2)" }}>
            Source: {facts.sourceProvider} · {fmtDate(facts.fetchedAt)}
          </p>
        )}
      </div>

      {/* Continue */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => { setStepDone("property"); onNext(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "#57f1db", color: "#0b141a" }}
        >
          Continue
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
