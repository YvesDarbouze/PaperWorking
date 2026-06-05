"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useAcquisitionWizard, type TermsData } from "@/store/acquisitionWizardStore";
import { AssignableField } from "@/components/acquisition/AssignableField";

// ─── Zod schema (mirrors the API) ────────────────────────────────────────────

const termsSchema = z
  .object({
    offerMadeCents:       z.number().int().nonnegative().nullable().optional(),
    offerDate:            z.string().nullable().optional(),
    sellerResponse:       z.enum(["PENDING", "ACCEPTED", "COUNTERED", "REJECTED"]).optional(),
    counterPriceCents:    z.number().int().nonnegative().nullable().optional(),
    acceptedPriceCents:   z.number().int().nonnegative().nullable().optional(),
    earnestMoneyCents:    z.number().int().nonnegative().nullable().optional(),
    estClosingCostsCents: z.number().int().nonnegative().nullable().optional(),
    amountPaidCents:      z.number().int().nonnegative().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sellerResponse === "COUNTERED" && !data.counterPriceCents) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: "Counter price required when seller has countered.",
        path:    ["counterPriceCents"],
      });
    }
  });

type TermsForm = z.infer<typeof termsSchema>;

// ─── Seller response options ──────────────────────────────────────────────────

const SELLER_RESPONSES = [
  { value: "PENDING",   label: "Pending",   icon: "hourglass_empty",  color: "rgba(218,228,236,0.4)"  },
  { value: "ACCEPTED",  label: "Accepted",  icon: "check_circle",     color: "#57f1db"                 },
  { value: "COUNTERED", label: "Countered", icon: "swap_horiz",       color: "#ffd1aa"                 },
  { value: "REJECTED",  label: "Rejected",  icon: "cancel",           color: "#F06543"                 },
] as const;

type SellerResponse = (typeof SELLER_RESPONSES)[number]["value"];

// ─── Formatters ───────────────────────────────────────────────────────────────

function centsToDisplay(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "";
  return (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function parseDollarInput(raw: string): number | null {
  const stripped = raw.replace(/[^0-9.]/g, "");
  if (!stripped) return null;
  const parsed = parseFloat(stripped);
  return isNaN(parsed) ? null : Math.round(parsed * 100);
}

function fmtCents(cents: number | null | undefined): string {
  if (cents == null) return "—";
  if (cents >= 100_000_000) return `$${(cents / 100_000_000).toFixed(2)}M`;
  if (cents >= 100_000)     return `$${(cents / 100_000).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString()}`;
}

function deltaPct(a: number | null | undefined, b: number | null | undefined): string | null {
  if (!a || !b || b === 0) return null;
  const pct = ((a - b) / b) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function deltaColor(cents: number | null | undefined, base: number | null | undefined): string {
  if (!cents || !base) return "rgba(218,228,236,0.4)";
  return cents <= base ? "#57f1db" : "#F06543";
}

// ─── Currency input ───────────────────────────────────────────────────────────

interface CurrencyInputProps {
  label:         string;
  valueCents:    number | null | undefined;
  onChange:      (cents: number | null) => void;
  error?:        string;
  required?:     boolean;
  placeholder?:  string;
}

function CurrencyInput({ label, valueCents, onChange, error, required, placeholder }: CurrencyInputProps) {
  const [raw, setRaw] = useState<string>(() => centsToDisplay(valueCents));
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    // Show plain number on focus for easier editing
    setRaw(valueCents ? String(valueCents / 100) : "");
  };

  const handleBlur = () => {
    setFocused(false);
    const cents = parseDollarInput(raw);
    onChange(cents);
    setRaw(centsToDisplay(cents));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaw(e.target.value);
  };

  const displayValue = focused ? raw : centsToDisplay(valueCents);

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.07em" }}>
        {label}{required && <span style={{ color: "#F06543" }}> *</span>}
      </label>
      <div
        className="flex items-center gap-2 rounded-xl px-4 py-3 transition-all duration-150"
        style={{
          background: "rgba(20,29,35,0.8)",
          border:     `1px solid ${error ? "#F0654340" : focused ? "rgba(87,241,219,0.3)" : "rgba(255,255,255,0.09)"}`,
          boxShadow:  focused ? "0 0 0 3px rgba(87,241,219,0.05)" : "none",
        }}
      >
        <span className="text-sm flex-shrink-0" style={{ color: "rgba(218,228,236,0.35)" }}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder ?? "0"}
          className="flex-1 bg-transparent outline-none text-sm tabular-nums"
          style={{ color: "rgba(218,228,236,0.9)" }}
        />
      </div>
      {error && <p className="text-[11px]" style={{ color: "#F06543" }}>{error}</p>}
    </div>
  );
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function saveTerms(projectId: string, data: TermsForm, token: string) {
  const res = await fetch(`/api/reil/projects/${projectId}/terms`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? `Save failed: ${res.status}`);
  }
  return res.json();
}

async function getProjectWithFacts(projectId: string, token: string) {
  const res = await fetch(`/api/reil/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

// ─── Context summary ──────────────────────────────────────────────────────────

interface ContextSummaryProps {
  form:          TermsForm;
  listPriceCents: number | null | undefined;
  comps:         Array<{ soldPriceCents: number }>;
}

function ContextSummary({ form, listPriceCents, comps }: ContextSummaryProps) {
  const offer    = form.offerMadeCents;
  const accepted = form.acceptedPriceCents ?? form.counterPriceCents;

  const avgComp = comps.length
    ? Math.round(comps.reduce((s, c) => s + c.soldPriceCents, 0) / comps.length)
    : null;

  const rows = [
    {
      label: "Offer vs. List Price",
      value: offer   ? fmtCents(offer)   : null,
      base:  listPriceCents,
      baseLabel: listPriceCents ? `List ${fmtCents(listPriceCents)}` : null,
    },
    {
      label: "Offer vs. Avg. Comp",
      value: offer   ? fmtCents(offer)   : null,
      base:  avgComp,
      baseLabel: avgComp ? `Avg comp ${fmtCents(avgComp)}` : null,
    },
    {
      label: "Accepted vs. Offer",
      value: accepted ? fmtCents(accepted) : null,
      base:  offer,
      baseLabel: offer ? `Offer ${fmtCents(offer)}` : null,
    },
  ].filter(r => r.value && r.base);

  if (!rows.length) return null;

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: "rgba(14,22,28,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.3)", letterSpacing: "0.08em" }}>
        Context — read only, no underwriting math
      </p>
      {rows.map(row => {
        const d = deltaPct(
          row.label.includes("Accepted") ? (accepted ?? null) : offer,
          row.base,
        );
        const col = deltaColor(
          row.label.includes("Accepted") ? (accepted ?? null) : offer,
          row.base,
        );
        return (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: "rgba(218,228,236,0.45)" }}>
              {row.label}
            </span>
            <div className="flex items-center gap-2">
              {row.baseLabel && (
                <span className="text-[11px]" style={{ color: "rgba(218,228,236,0.25)" }}>
                  {row.baseLabel}
                </span>
              )}
              {d && (
                <span className="text-[12px] font-bold" style={{ color: col }}>
                  {d}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TermsStep ────────────────────────────────────────────────────────────────

export function TermsStep({ onNext }: { onNext: () => void }) {
  const { projectId, terms, setTerms, setStepDone, setStepPartial } = useAcquisitionWizard();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Local form state (mirrors store, managed here for tight validation UX)
  const [form, setForm] = useState<TermsForm>({
    offerMadeCents:       terms.offerMadeCents       ?? null,
    offerDate:            terms.offerDate             ?? null,
    sellerResponse:       (terms.sellerResponse as SellerResponse) ?? "PENDING",
    counterPriceCents:    terms.counterPriceCents     ?? null,
    acceptedPriceCents:   terms.acceptedPriceCents    ?? null,
    earnestMoneyCents:    terms.earnestMoneyCents     ?? null,
    estClosingCostsCents: terms.estClosingCostsCents  ?? null,
    amountPaidCents:      terms.amountPaidCents       ?? null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch property facts for context summary (reuses PropertyStep cache)
  const { data: projectData } = useQuery({
    queryKey: ["property-facts", projectId],
    queryFn:  async () => {
      const token = await user?.getIdToken();
      if (!token || !projectId) return null;
      return getProjectWithFacts(projectId, token);
    },
    enabled:   !!projectId && !!user,
    staleTime: 60_000,
  });

  const listPriceCents: number | null =
    projectData?.propertyFacts?.listPriceCents != null
      ? Number(projectData.propertyFacts.listPriceCents)
      : null;

  const comps: Array<{ soldPriceCents: number }> = (projectData?.comps ?? []).map(
    (c: any) => ({ soldPriceCents: Number(c.soldPriceCents) }),
  );

  // Sync to store on every change
  const updateForm = useCallback(
    (patch: Partial<TermsForm>) => {
      setForm(prev => {
        const next = { ...prev, ...patch };
        // If response is no longer COUNTERED, clear counter price
        if (next.sellerResponse !== "COUNTERED") next.counterPriceCents = null;
        setTerms(next as Partial<TermsData>);
        setStepPartial("terms");
        return next;
      });
      setErrors({});
    },
    [setTerms, setStepPartial],
  );

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsed = termsSchema.safeParse(form);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach(issue => {
          fieldErrors[String(issue.path[0])] = issue.message;
        });
        setErrors(fieldErrors);
        throw new Error("Validation failed");
      }
      const token = await user?.getIdToken();
      if (!token || !projectId) throw new Error("Project not saved yet.");
      return saveTerms(projectId, parsed.data, token);
    },
    onSuccess: () => {
      setSaveError(null);
      setErrors({});
      setStepDone("terms");
      qc.invalidateQueries({ queryKey: ["property-facts", projectId] });
    },
    onError: (err: Error) => {
      if (err.message !== "Validation failed") setSaveError(err.message);
    },
  });

  const handleSaveAndContinue = useCallback(async () => {
    await saveMutation.mutateAsync();
    onNext();
  }, [saveMutation, onNext]);

  const isCountered = form.sellerResponse === "COUNTERED";
  const hasAnyAmount = !!(
    form.offerMadeCents ||
    form.acceptedPriceCents ||
    form.earnestMoneyCents ||
    form.estClosingCostsCents
  );

  return (
    <div className="flex flex-col gap-8 max-w-[600px] w-full mx-auto">

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-2" style={{ color: "rgba(218,228,236,0.95)", letterSpacing: "-0.02em" }}>
          Purchase Terms
        </h2>
        <p className="text-sm" style={{ color: "rgba(218,228,236,0.4)" }}>
          All fields optional — fill in what you know. Stored as integer cents.
        </p>
      </div>

      {/* ── Offer section ── */}
      <section className="space-y-5">
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.35)", letterSpacing: "0.08em" }}>
          Offer
        </p>

        <div className="grid grid-cols-2 gap-4">
          <AssignableField
            fieldKey="terms.offerMadeCents"
            label="Offer Amount"
            hasValue={!!form.offerMadeCents}
          >
            <CurrencyInput
              label="Offer Amount"
              valueCents={form.offerMadeCents}
              onChange={v => updateForm({ offerMadeCents: v })}
              error={errors.offerMadeCents}
            />
          </AssignableField>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.4)", letterSpacing: "0.07em" }}>
              Offer Date
            </label>
            <input
              type="date"
              value={form.offerDate ?? ""}
              onChange={e => updateForm({ offerDate: e.target.value || null })}
              className="w-full rounded-xl px-4 py-3 text-sm bg-transparent outline-none"
              style={{ background: "rgba(20,29,35,0.8)", border: "1px solid rgba(255,255,255,0.09)", color: "rgba(218,228,236,0.85)", colorScheme: "dark" }}
            />
          </div>
        </div>
      </section>

      {/* ── Seller response ── */}
      <section className="space-y-4">
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.35)", letterSpacing: "0.08em" }}>
          Seller Response
        </p>

        <div className="grid grid-cols-2 gap-2">
          {SELLER_RESPONSES.map(opt => {
            const active = form.sellerResponse === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => updateForm({ sellerResponse: opt.value })}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150"
                style={{
                  background: active ? `${opt.color}12` : "rgba(20,29,35,0.65)",
                  border:     `1px solid ${active ? `${opt.color}35` : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span className="material-symbols-outlined text-[18px] flex-shrink-0" style={{ color: active ? opt.color : "rgba(218,228,236,0.3)", fontVariationSettings: "'FILL' 0" }}>
                  {opt.icon}
                </span>
                <span className="text-[13px] font-medium" style={{ color: active ? "rgba(218,228,236,0.95)" : "rgba(218,228,236,0.55)" }}>
                  {opt.label}
                </span>
                {active && (
                  <span className="ml-auto material-symbols-outlined text-[14px]" style={{ color: opt.color, fontVariationSettings: "'FILL' 1" }}>
                    radio_button_checked
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Conditional counter price */}
        {isCountered && (
          <div className="pl-4 border-l-2" style={{ borderColor: "#ffd1aa40" }}>
            <CurrencyInput
              label="Counter Price"
              valueCents={form.counterPriceCents}
              onChange={v => updateForm({ counterPriceCents: v })}
              error={errors.counterPriceCents}
              required
              placeholder="Seller's counter amount"
            />
          </div>
        )}
      </section>

      {/* ── Negotiated + paid ── */}
      <section className="space-y-4">
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "rgba(218,228,236,0.35)", letterSpacing: "0.08em" }}>
          Agreed & Paid
        </p>

        <div className="grid grid-cols-2 gap-4">
          <CurrencyInput
            label="Accepted Price"
            valueCents={form.acceptedPriceCents}
            onChange={v => updateForm({ acceptedPriceCents: v })}
            error={errors.acceptedPriceCents}
          />
          <AssignableField
            fieldKey="terms.earnestMoneyCents"
            label="Earnest Money"
            hasValue={!!form.earnestMoneyCents}
          >
            <CurrencyInput
              label="Earnest Money"
              valueCents={form.earnestMoneyCents}
              onChange={v => updateForm({ earnestMoneyCents: v })}
              error={errors.earnestMoneyCents}
            />
          </AssignableField>
          <CurrencyInput
            label="Est. Closing Costs"
            valueCents={form.estClosingCostsCents}
            onChange={v => updateForm({ estClosingCostsCents: v })}
            error={errors.estClosingCostsCents}
          />
          <CurrencyInput
            label="Amount Paid to Date"
            valueCents={form.amountPaidCents}
            onChange={v => updateForm({ amountPaidCents: v })}
            error={errors.amountPaidCents}
          />
        </div>
      </section>

      {/* ── Context summary ── */}
      {hasAnyAmount && (
        <ContextSummary form={form} listPriceCents={listPriceCents} comps={comps} />
      )}

      {/* Save error */}
      {saveError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span className="material-symbols-outlined text-[16px]" style={{ color: "#F06543" }}>error</span>
          <span className="text-[12px]" style={{ color: "rgba(218,228,236,0.7)" }}>{saveError}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onNext} className="text-[12px]" style={{ color: "rgba(218,228,236,0.3)" }}>
          Skip for now →
        </button>
        <button
          onClick={handleSaveAndContinue}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: saveMutation.isPending ? "rgba(87,241,219,0.1)" : "#57f1db",
            color:      saveMutation.isPending ? "#57f1db" : "#0b141a",
          }}
        >
          {saveMutation.isPending ? "Saving…" : !projectId ? "Save address first" : "Save & Continue"}
          <span className="material-symbols-outlined text-[18px]">
            {saveMutation.isPending ? "hourglass_empty" : "arrow_forward"}
          </span>
        </button>
      </div>
    </div>
  );
}
