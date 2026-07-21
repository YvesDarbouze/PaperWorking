"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard } from "@/store/acquisitionWizardStore";
import { useState, useMemo } from "react";
import { MarketContextPanel } from "@/components/project/MarketContextPanel";
import { deriveAllMetrics } from "@/lib/metrics/reiMetrics";
import { ProjectFinancials } from "@/types/schema";

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
  return { facts: data.propertyFacts, comps: data.comps ?? [], zip: data.zip };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCents(cents: number | bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  if (n >= 100_000_00) return `$${(n / 100_000_00).toFixed(1)}M`;
  if (n >= 1_000_00)   return `$${(n / 1_000_00).toFixed(0)}K`;
  return `$${(n / 100).toLocaleString()}`;
}

function fmtDollars(cents: number | bigint | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const dollars = (typeof cents === "bigint" ? Number(cents) : cents) / 100;
  return `$${dollars.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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
  const { projectId, address, terms, setStepDone } = useAcquisitionWizard();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [manualEntryRequired, setManualEntryRequired] = useState(false);

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
    onSuccess: (result) => {
      if (result.manualEntryRequired) {
        setManualEntryRequired(true);
      } else {
        setManualEntryRequired(false);
        qc.invalidateQueries({ queryKey: ["property-facts", projectId] });
      }
      setStepDone("property");
    },
    // 2 automatic retries with backoff on mutation failures
    retry:      2,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 6000),
  });

  // Auto-fetch on first visit if no facts exist yet
  const hasAutoFetched = data?.facts != null;
  const shouldAutoFetch = !isLoading && !hasAutoFetched && !!projectId && !enrichMutation.isPending && !enrichMutation.isError && !manualEntryRequired;

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
  const zip = data?.zip ?? "";
  const loading = isLoading || enrichMutation.isPending;

  // ── Filter Comps by Type ────────────────────────────────────────────────────
  const saleComps = useMemo(() => comps.filter((c: any) => c.compType !== "RENTAL"), [comps]);
  const rentalComps = useMemo(() => comps.filter((c: any) => c.compType === "RENTAL"), [comps]);

  // ── Calculate pro-forma metrics ─────────────────────────────────────────────
  const purchasePriceCents = terms?.acceptedPriceCents || terms?.offerMadeCents || facts?.listPriceCents || 0;
  const rentCents = facts?.estRentCents || 0;

  const { noiPreview, capRatePreview, grmPreview } = useMemo(() => {
    if (!purchasePriceCents || !rentCents) {
      return { noiPreview: "—", capRatePreview: "—", grmPreview: "—" };
    }

    const price = Number(purchasePriceCents) / 100;
    const rentMonthly = Number(rentCents) / 100;

    // Convert annual tax/HOA cents to monthly dollar values
    const taxMonthly = facts?.annualPropertyTaxCents ? (Number(facts.annualPropertyTaxCents) / 100) / 12 : price * 0.012 / 12;
    const hoaMonthly = facts?.hoaMonthlyCents ? Number(facts.hoaMonthlyCents) / 100 : 0;

    const tempFinancials: ProjectFinancials = {
      purchasePrice: price,
      estimatedARV: price,
      gross_rent_per_unit: rentMonthly,
      vacancy_pct: 7,
      tax: taxMonthly,
      insurance: 1200 / 12, // $100/mo
      utilities: 0,
      management_pct: 8,
      maintenance_pct: 5,
      HOA: hoaMonthly,
      costs: [],
    };

    const derived = deriveAllMetrics(tempFinancials);
    const noi = derived.noi;
    const capRate = derived.capRate;
    const grm = derived.grossRentMultiplier;

    return {
      noiPreview: `$${noi.toLocaleString()}/yr`,
      capRatePreview: `${capRate.toFixed(2)}%`,
      grmPreview: grm.toFixed(2),
    };
  }, [purchasePriceCents, rentCents, facts]);

  // ── Build the facts grid items ──────────────────────────────────────────────
  const factItems = [
    { label: "Beds",         value: facts?.beds   != null ? `${facts.beds} bd`        : null,          icon: "bed"            },
    { label: "Baths",        value: facts?.baths  != null ? `${facts.baths} ba`        : null,          icon: "bathroom"       },
    { label: "Sq Ft",        value: facts?.sqft   != null ? `${facts.sqft.toLocaleString()} sqft` : null, icon: "square_foot"   },
    { label: "Year Built",   value: facts?.yearBuilt != null ? `${facts.yearBuilt}` : null,             icon: "calendar_today" },
    { label: "Lot",          value: facts?.lotSqft != null ? `${facts.lotSqft.toLocaleString()} sqft` : null, icon: "landscape" },
    { label: "Type",         value: facts?.propertyType ?? null,                                        icon: "home_work"      },
    { label: "List Price",   value: fmtCents(facts?.listPriceCents),                                    icon: "sell"           },
    { 
      label: "AVM Value",   
      value: facts?.avmPriceCents 
        ? `${fmtCents(facts.avmPriceCents)}` + 
          (facts.avmPriceLowCents && facts.avmPriceHighCents 
            ? ` (${fmtDollars(facts.avmPriceLowCents)}–${fmtDollars(facts.avmPriceHighCents)})`
            : "") 
        : null,                                                                                         icon: "analytics"      
    },
    { 
      label: "Est. Rent",    
      value: facts?.estRentCents 
        ? `${fmtCents(facts.estRentCents)}/mo` + 
          (facts.estRentLowCents && facts.estRentHighCents 
            ? ` (${fmtDollars(facts.estRentLowCents)}–${fmtDollars(facts.estRentHighCents)})`
            : "") 
        : null,                                                                                         icon: "payments"       
    },
    { label: "Last Sold",    value: fmtCents(facts?.lastSoldPriceCents),                                icon: "paid"           },
    { label: "Sold Date",    value: fmtDate(facts?.lastSoldDate),                                       icon: "event"          },
  ];

  // ── Add tax & HOA rows if present ───────────────────────────────────────────
  if (facts?.annualPropertyTaxCents) {
    factItems.push({
      label: "Property Tax",
      value: `${fmtDollars(facts.annualPropertyTaxCents)}/yr`,
      icon: "receipt_long",
    });
  }
  if (facts?.taxAssessedValueCents) {
    factItems.push({
      label: "Assessed Value",
      value: fmtDollars(facts.taxAssessedValueCents),
      icon: "assessment",
    });
  }
  if (facts?.hoaMonthlyCents) {
    factItems.push({
      label: "HOA",
      value: `${fmtDollars(facts.hoaMonthlyCents)}/mo`,
      icon: "apartment",
    });
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-[720px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ color: "rgba(253,255,252,0.95)", letterSpacing: "-0.02em" }}
          >
            Property Details
          </h2>
          <p className="text-sm" style={{ color: "rgba(253,255,252,0.4)" }}>
            {address.formattedAddress ?? "Selected property"}
          </p>
        </div>
        <button
          onClick={() => enrichMutation.mutate()}
          disabled={enrichMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150"
          style={{
            background: "rgba(69,73,85,0.08)",
            border: "1px solid rgba(69,73,85,0.18)",
            color: "#454955",
            opacity: enrichMutation.isPending ? 0.5 : 1,
          }}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 0" }}>
            refresh
          </span>
          {enrichMutation.isPending ? "Fetching…" : "Refresh data"}
        </button>
      </div>

      {/* Manual entry fallback banner */}
      {manualEntryRequired && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0" style={{ color: "#F59E0B" }}>info</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: "rgba(253,255,252,0.85)" }}>
              No property record found
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "rgba(253,255,252,0.5)" }}>
              This address doesn't have an automated record available. You can continue and enter property details manually in the next steps.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {(isError || enrichMutation.isError) && !loading && !manualEntryRequired && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0" style={{ color: "#F06543" }}>error</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px]" style={{ color: "rgba(253,255,252,0.7)" }}>
              {(enrichMutation.error as Error)?.message ?? (error as Error)?.message ?? "Failed to load property data."}
            </p>
            {failureCount > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(253,255,252,0.35)" }}>
                Retried {failureCount} time{failureCount !== 1 ? "s" : ""}. Check your connection.
              </p>
            )}
          </div>
          <button
            onClick={() => enrichMutation.mutate()}
            className="flex-shrink-0 text-[12px] font-semibold hover:opacity-70"
            style={{ color: "#454955" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Photo */}
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ height: "220px", background: "rgba(22,19,24,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
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
            <span className="material-symbols-outlined text-4xl" style={{ color: "rgba(253,255,252,0.15)" }}>
              home
            </span>
          </div>
        )}
      </div>

      {/* Facts grid */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(253,255,252,0.4)", letterSpacing: "0.08em" }}>
          Property Facts
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {factItems.map(({ label, value, icon }) => (
            <div
              key={label}
              className="rounded-xl p-4 flex flex-col gap-2"
              style={{
                background: "rgba(22,19,24,0.6)",
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
                    className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"
                    style={{ color: "rgba(253,255,252,0.35)", letterSpacing: "0.07em" }}
                  >
                    <span className="material-symbols-outlined text-[12px]">{icon}</span>
                    {label}
                  </span>
                  <span className="text-[14px] font-semibold" style={{ color: value ? "rgba(253,255,252,0.9)" : "rgba(253,255,252,0.2)" }}>
                    {value ?? "—"}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Provenance and Disclaimer Badges */}
        {!loading && (facts?.taxSource || facts?.avmPriceCents) && (
          <div className="flex flex-col gap-2 mt-3">
            {facts?.taxSource && facts?.annualPropertyTaxCents && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg w-fit"
                style={{ background: "rgba(69,73,85,0.08)", border: "1px solid rgba(69,73,85,0.12)" }}
              >
                <span className="material-symbols-outlined text-[12px]" style={{ color: "rgba(253,255,252,0.3)" }}>verified</span>
                <span className="text-[10px]" style={{ color: "rgba(253,255,252,0.35)" }}>
                  Tax data sourced from <span className="font-semibold capitalize">{facts.taxSource}</span>
                  {facts.taxYear ? ` (${facts.taxYear})` : ""}
                  {" · "}Used as underwriting default
                </span>
              </div>
            )}
            {facts?.avmPriceCents && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg w-fit"
                style={{ background: "rgba(69,73,85,0.08)", border: "1px solid rgba(69,73,85,0.12)" }}
              >
                <span className="material-symbols-outlined text-[12px]" style={{ color: "rgba(253,255,252,0.3)" }}>info</span>
                <span className="text-[10px]" style={{ color: "rgba(253,255,252,0.35)" }}>
                  AVM Value is an automated estimate, not a professional appraisal. Sourced from RentCast AVM.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NOI / Cap Rate / GRM Preview Card */}
      {!loading && facts?.estRentCents && (
        <div
          className="rounded-2xl p-5 border border-[#454955]/20 relative overflow-hidden"
          style={{ background: "rgba(14,22,28,0.6)", backdropFilter: "blur(12px)" }}
        >
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#454955]/5 rounded-full blur-3xl" />
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(253,255,252,0.3)", letterSpacing: "0.08em" }}>
            Pro-Forma Underwriting Preview
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "rgba(253,255,252,0.4)" }}>NOI (Est.)</span>
              <span className="text-lg font-bold" style={{ color: "rgba(253,255,252,0.9)" }}>{noiPreview}</span>
            </div>
            <div className="flex flex-col gap-1 border-x border-white/5">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "rgba(253,255,252,0.4)" }}>Cap Rate (Est.)</span>
              <span className="text-lg font-bold" style={{ color: "#454955" }}>{capRatePreview}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "rgba(253,255,252,0.4)" }}>GRM (Est.)</span>
              <span className="text-lg font-bold" style={{ color: "#7A9EAA" }}>{grmPreview}</span>
            </div>
          </div>
          <p className="text-[9px] mt-3" style={{ color: "rgba(253,255,252,0.25)" }}>
            * Calculations based on RentCast rent estimate and target purchase price ({fmtCents(purchasePriceCents)}). Assumes 7% vacancy rate and 35% operating expense ratio fallback if tax data is absent.
          </p>
        </div>
      )}

      {/* Market Context Panel */}
      {!loading && zip && (
        <MarketContextPanel
          zipCode={zip}
          beds={facts?.beds}
          propertyType={facts?.propertyType}
          projectRent={facts?.estRentCents ? Number(facts.estRentCents) / 100 : undefined}
          projectPrice={purchasePriceCents ? Number(purchasePriceCents) / 100 : undefined}
          projectSqft={facts?.sqft}
        />
      )}

      {/* Sold Comps */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(253,255,252,0.4)", letterSpacing: "0.08em" }}>
          Sold Comparables
        </h3>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(14,22,28,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-9 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(253,255,252,0.3)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="col-span-2">Address</span>
            <span className="text-right">Price</span>
            <span className="text-right">Status</span>
            <span className="text-right">Sold Date</span>
            <span className="text-right">Beds/Ba</span>
            <span className="text-right">Dist.</span>
            <span className="text-right">DOM</span>
            <span className="text-right">Similarity</span>
          </div>

          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-9 px-4 py-3 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="col-span-2"><SkeletonBox h="12px" /></div>
                  <SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" />
                </div>
              ))
            : saleComps.length === 0
            ? (
                <div className="py-8 text-center">
                  <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.25)" }}>No comps available.</p>
                </div>
              )
            : saleComps.map((c: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-9 px-4 py-3 text-[13px] items-center"
                  style={{
                    borderBottom: i < saleComps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    color: "rgba(253,255,252,0.7)",
                  }}
                >
                  <span className="col-span-2 truncate">{c.addressLine}</span>
                  <span className="text-right font-semibold" style={{ color: "rgba(253,255,252,0.9)" }}>
                    {fmtCents(c.soldPriceCents ?? c.priceCents)}
                  </span>
                  <span className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: c.status === "Sold" ? "rgba(69,73,85,0.18)" : "rgba(245,158,11,0.15)", color: c.status === "Sold" ? "#454955" : "#F59E0B" }}>
                      {c.status ?? "Sold"}
                    </span>
                  </span>
                  <span className="text-right">{fmtDate(c.soldDate ?? c.listedDate)}</span>
                  <span className="text-right">{c.beds ?? "—"} / {c.baths ?? "—"}</span>
                  <span className="text-right">{c.distanceMiles != null ? `${c.distanceMiles} mi` : "—"}</span>
                  <span className="text-right">{c.daysOnMarket != null ? `${c.daysOnMarket}d` : "—"}</span>
                  <span className="text-right flex items-center justify-end gap-1.5">
                    {c.correlation != null ? (
                      <>
                        <div className="w-12 h-1.5 rounded-full overflow-hidden bg-white/10 hidden md:block">
                          <div className="h-full bg-[#454955]" style={{ width: `${c.correlation * 100}%` }} />
                        </div>
                        <span className="font-semibold text-xs text-[#454955]">{Math.round(c.correlation * 100)}%</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              ))
          }
        </div>
      </div>

      {/* Rental Comps */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4 mt-2" style={{ color: "rgba(253,255,252,0.4)", letterSpacing: "0.08em" }}>
          Rental Comparables
        </h3>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "rgba(14,22,28,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-9 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(253,255,252,0.3)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="col-span-2">Address</span>
            <span className="text-right">Rent</span>
            <span className="text-right">Status</span>
            <span className="text-right">Date</span>
            <span className="text-right">Beds/Ba</span>
            <span className="text-right">Dist.</span>
            <span className="text-right">DOM</span>
            <span className="text-right">Similarity</span>
          </div>

          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-9 px-4 py-3 gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="col-span-2"><SkeletonBox h="12px" /></div>
                  <SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" /><SkeletonBox h="12px" />
                </div>
              ))
            : rentalComps.length === 0
            ? (
                <div className="py-8 text-center">
                  <p className="text-[12px]" style={{ color: "rgba(253,255,252,0.25)" }}>No rental comps available.</p>
                </div>
              )
            : rentalComps.map((c: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-9 px-4 py-3 text-[13px] items-center"
                  style={{
                    borderBottom: i < rentalComps.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    color: "rgba(253,255,252,0.7)",
                  }}
                >
                  <span className="col-span-2 truncate">{c.addressLine}</span>
                  <span className="text-right font-semibold" style={{ color: "rgba(253,255,252,0.9)" }}>
                    {fmtCents(c.priceCents)}/mo
                  </span>
                  <span className="text-right">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: c.status === "Rented" ? "rgba(122,158,170,0.18)" : "rgba(245,158,11,0.15)", color: c.status === "Rented" ? "#7A9EAA" : "#F59E0B" }}>
                      {c.status ?? "Rented"}
                    </span>
                  </span>
                  <span className="text-right">{fmtDate(c.listedDate)}</span>
                  <span className="text-right">{c.beds ?? "—"} / {c.baths ?? "—"}</span>
                  <span className="text-right">{c.distanceMiles != null ? `${c.distanceMiles} mi` : "—"}</span>
                  <span className="text-right">{c.daysOnMarket != null ? `${c.daysOnMarket}d` : "—"}</span>
                  <span className="text-right flex items-center justify-end gap-1.5">
                    {c.correlation != null ? (
                      <>
                        <div className="w-12 h-1.5 rounded-full overflow-hidden bg-white/10 hidden md:block">
                          <div className="h-full bg-[#7A9EAA]" style={{ width: `${c.correlation * 100}%` }} />
                        </div>
                        <span className="font-semibold text-xs text-[#7A9EAA]">{Math.round(c.correlation * 100)}%</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              ))
          }
        </div>
      </div>

      {facts?.sourceProvider && (
        <p className="text-[10px] mt-2 text-right" style={{ color: "rgba(253,255,252,0.2)" }}>
          Source: {facts.sourceProvider} · {fmtDate(facts.fetchedAt)}
        </p>
      )}

      {/* Continue */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => { setStepDone("property"); onNext(); }}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ background: "#454955", color: "#0d0a0b" }}
        >
          {manualEntryRequired ? "Continue to Manual Entry" : "Continue"}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
