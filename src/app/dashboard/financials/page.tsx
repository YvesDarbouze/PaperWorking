"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProjectStore } from "@/store/projectStore";
import { saveFinancials, loadFinancials } from "@/actions/financials";
import type { FinancialsPayload } from "@/actions/financials";
import NOIInputTerminal from "@/components/dashboard/financials/NOIInputTerminal";
import NOIWaterfallChart from "@/components/dashboard/financials/NOIWaterfallChart";
import CashFlowInputTerminal from "@/components/dashboard/financials/CashFlowInputTerminal";
import CashFlowDeepDive from "@/components/dashboard/financials/CashFlowDeepDive";

function computeMonthlyPayment(principal: number, annualRatePercent: number, years: number) {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRatePercent <= 0) return principal / (years * 12);
  
  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = years * 12;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return payment;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type LoadStatus = "loading" | "ready" | "no-project";

export default function FinancialsTerminal() {
  const { user } = useAuth();
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setDeal = useProjectStore((s) => s.setDeal);

  // --- Project Selector ---
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // --- Load Status ---
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [toastMessage, setToastMessage] = useState("");
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- NOI State (empty = undefined until loaded) ---
  const [gri, setGri] = useState<number | undefined>(undefined);
  const [otherIncome, setOtherIncome] = useState<number | undefined>(undefined);
  const [vacancyPct, setVacancyPct] = useState<number | undefined>(undefined);
  const [opex, setOpex] = useState<number | undefined>(undefined);
  
  // --- Cash Flow State ---
  const [loanAmount, setLoanAmount] = useState<number | undefined>(undefined);
  const [interestRate, setInterestRate] = useState<number | undefined>(undefined);
  const [loanTerm, setLoanTerm] = useState<number | undefined>(undefined);
  const [otherDebt, setOtherDebt] = useState<number | undefined>(undefined);

  // Auto-save tracking
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedData = useRef(false);

  // --- Initialize project selection ---
  useEffect(() => {
    if (currentProject) {
      setSelectedProjectId(currentProject.id);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
    if (projects.length === 0) {
      setLoadStatus("no-project");
    }
  }, [currentProject, projects, selectedProjectId]);

  // --- Load financials from Firestore when project changes ---
  useEffect(() => {
    if (!selectedProjectId || !user) {
      if (projects.length === 0) setLoadStatus("no-project");
      return;
    }

    hasLoadedData.current = false;
    setLoadStatus("loading");
    setSaveStatus("idle");

    (async () => {
      try {
        const idToken = await user.getIdToken();
        const data = await loadFinancials(idToken, selectedProjectId);

        if (data) {
          // Hydrate from Firestore
          setGri(data.income.grossRent);
          setOtherIncome(data.income.otherIncome);
          setVacancyPct(data.income.vacancyRate);
          setOpex(data.expenses.opex);
          setLoanAmount(data.financing.loanAmount);
          setInterestRate(data.financing.interestRate);
          setLoanTerm(data.financing.loanTermYears);
          setOtherDebt(data.financing.otherMonthlyDebt);
        } else {
          // First visit — show empty fields (undefined triggers placeholder text)
          setGri(undefined);
          setOtherIncome(undefined);
          setVacancyPct(undefined);
          setOpex(undefined);
          setLoanAmount(undefined);
          setInterestRate(undefined);
          setLoanTerm(undefined);
          setOtherDebt(undefined);
        }

        setLoadStatus("ready");
        // Small delay so the first render with data doesn't trigger auto-save
        setTimeout(() => { hasLoadedData.current = true; }, 200);
      } catch (err) {
        console.error("[FinancialsTerminal] Load error:", err);
        setLoadStatus("ready");
        hasLoadedData.current = true;
      }
    })();
  }, [selectedProjectId, user, projects.length]);

  // --- Also set the project in the store when switching ---
  useEffect(() => {
    if (selectedProject && selectedProject.id !== currentProject?.id) {
      setDeal(selectedProject);
    }
  }, [selectedProject, currentProject?.id, setDeal]);

  // --- Derived NOI ---
  const griVal = gri ?? 0;
  const otherIncomeVal = otherIncome ?? 0;
  const vacancyPctVal = vacancyPct ?? 0;
  const opexVal = opex ?? 0;
  const grossIncome = griVal + otherIncomeVal;
  const vacancyLoss = grossIncome * (vacancyPctVal / 100);
  const noi = grossIncome - vacancyLoss - opexVal;

  // --- Derived Cash Flow ---
  const loanAmountVal = loanAmount ?? 0;
  const interestRateVal = interestRate ?? 0;
  const loanTermVal = loanTerm ?? 0;
  const otherDebtVal = otherDebt ?? 0;
  const monthlyPI = computeMonthlyPayment(loanAmountVal, interestRateVal, loanTermVal);
  const annualDebtService = (monthlyPI + otherDebtVal) * 12;
  const cashFlow = noi - annualDebtService;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  const formatCur = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);

  // --- Show toast ---
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToastMessage(""), 3000);
  }, []);

  // --- Save handler ---
  const handleSave = useCallback(async () => {
    if (!user || !selectedProjectId) return;
    setSaveStatus("saving");

    try {
      const idToken = await user.getIdToken();
      const payload: FinancialsPayload = {
        income: {
          grossRent: griVal,
          otherIncome: otherIncomeVal,
          vacancyRate: vacancyPctVal,
        },
        expenses: {
          opex: opexVal,
        },
        financing: {
          loanAmount: loanAmountVal,
          interestRate: interestRateVal,
          loanTermYears: loanTermVal,
          otherMonthlyDebt: otherDebtVal,
        },
      };

      await saveFinancials(idToken, selectedProjectId, payload);
      setSaveStatus("saved");
      showToast("Financials saved.");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err: any) {
      console.error("[FinancialsTerminal] Save error:", err);
      setSaveStatus("error");
      showToast("Save failed — please try again.");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [user, selectedProjectId, griVal, otherIncomeVal, vacancyPctVal, opexVal, loanAmountVal, interestRateVal, loanTermVal, otherDebtVal, showToast]);

  // --- Debounced auto-save (1500ms after any field change) ---
  useEffect(() => {
    if (!hasLoadedData.current || loadStatus !== "ready") return;
    if (!selectedProjectId || !user) return;

    setSaveStatus("saving");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      handleSave();
    }, 1500);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [griVal, otherIncomeVal, vacancyPctVal, opexVal, loanAmountVal, interestRateVal, loanTermVal, otherDebtVal]);

  // --- No-project state ---
  if (loadStatus === "no-project") {
    return (
      <div className="min-h-screen bg-transparent text-on-surface font-body-md flex flex-col items-center justify-center gap-6">
        <span className="material-symbols-outlined text-primary text-5xl">apartment</span>
        <h2 className="font-headline-md text-xl text-on-surface">No projects yet</h2>
        <p className="text-on-surface-variant text-center max-w-md">
          Create your first investment project to start tracking financials.
        </p>
        <a href="/dashboard/projects/new" className="bg-primary text-on-primary px-6 py-3 rounded-lg font-bold hover:shadow-[0_0_20px_rgba(87,241,219,0.4)] transition-all">
          Create Project
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-on-surface font-body-md pb-32">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-50 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-white/10 shadow-sm flex items-center justify-between px-6 h-20">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-2xl">terminal</span>
          <h1 className="font-headline-md text-headline-md font-bold tracking-tighter text-primary">Financial Terminal</h1>
        </div>

        {/* Project Selector + Auto-save Indicator */}
        <div className="flex items-center gap-4">
          {/* Auto-save status */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            {saveStatus === "saving" && (
              <><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 animate-pulse" /><span className="text-on-surface-variant">Saving…</span></>
            )}
            {saveStatus === "saved" && (
              <><span className="inline-block w-2 h-2 rounded-full bg-primary" /><span className="text-primary">Saved</span></>
            )}
            {saveStatus === "error" && (
              <><span className="inline-block w-2 h-2 rounded-full bg-error" /><span className="text-error">Error</span></>
            )}
          </div>

          {/* Project Dropdown */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-surface-container-high border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none max-w-[220px] truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.propertyName || p.address || `Project ${p.id.slice(0, 6)}`}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Loading Skeleton */}
      {loadStatus === "loading" ? (
        <main className="w-full max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-xl p-8 animate-pulse" style={{ background: "rgba(11, 20, 26, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <div className="h-4 bg-white/10 rounded w-1/3 mb-6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-white/5 rounded" />
                <div className="h-10 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </main>
      ) : (
        <main className="w-full max-w-5xl mx-auto px-4 md:px-gutter-desktop py-stack-lg space-y-stack-lg">
          
          {/* --- NOI TERMINAL --- */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 border-b border-white/10 pb-2">
              1. NOI Input Terminal
            </h2>
            
            <NOIInputTerminal 
              gri={griVal} setGri={(v) => setGri(v)}
              otherIncome={otherIncomeVal} setOtherIncome={(v) => setOtherIncome(v)}
              vacancyPct={vacancyPctVal} setVacancyPct={(v) => setVacancyPct(v)}
              opex={opexVal} setOpex={(v) => setOpex(v)}
              vacancyLoss={vacancyLoss}
            />

            <div className="pt-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">NOI Analysis</h3>
              <div className="glass-card rounded-xl p-6 relative overflow-hidden" style={{ background: "rgba(11, 20, 26, 0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <NOIWaterfallChart 
                  grossIncome={grossIncome}
                  vacancyLoss={vacancyLoss}
                  opex={opexVal}
                  noi={noi}
                />
              </div>
            </div>
          </div>

          {/* --- CASH FLOW TERMINAL --- */}
          <div className="space-y-6 pt-8">
            <h2 className="text-xl font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 border-b border-white/10 pb-2">
              2. Cash Flow Datapoint Agent
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CashFlowInputTerminal 
                loanAmount={loanAmountVal} setLoanAmount={(v) => setLoanAmount(v)}
                interestRate={interestRateVal} setInterestRate={(v) => setInterestRate(v)}
                loanTerm={loanTermVal} setLoanTerm={(v) => setLoanTerm(v)}
                otherDebt={otherDebtVal} setOtherDebt={(v) => setOtherDebt(v)}
              />

              <CashFlowDeepDive 
                annualDebtService={annualDebtService}
                monthlyPI={monthlyPI}
                dscr={dscr}
                cashFlow={cashFlow}
              />
            </div>
          </div>
        </main>
      )}

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 w-full h-20 bg-surface-container-highest/90 backdrop-blur-2xl border-t border-primary/20 shadow-[0_-4px_20px_rgba(87,241,219,0.15)] z-[60]">
        <div className="h-full max-w-5xl mx-auto px-4 md:px-gutter-desktop flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2 overflow-hidden">
            <div className="hidden lg:flex items-center gap-1 font-mono text-[10px] text-on-surface-variant font-bold uppercase truncate">
              NOI <span className="text-on-surface">{formatCur(noi)}</span>
              <span className="mx-1 opacity-20">|</span> 
              Debt Service <span className="text-error">{formatCur(annualDebtService)}</span>
              <span className="mx-2">=</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold leading-none mb-1">Cash Flow</span>
              <div className={`font-mono text-xl md:text-[22px] font-bold whitespace-nowrap leading-none ${cashFlow > 0 ? 'text-primary' : 'text-error'}`}>
                {formatCur(cashFlow)}/yr <span className="text-sm font-sans font-medium text-on-surface-variant">({formatCur(cashFlow / 12)}/mo)</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving" || loadStatus === "loading" || !selectedProjectId}
            className="bg-primary text-on-primary px-6 h-10 md:h-12 rounded-lg font-bold flex items-center gap-2 hover:shadow-[0_0_20px_rgba(87,241,219,0.4)] active:scale-95 transition-all duration-150 whitespace-nowrap ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveStatus === "saving" ? (
              <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> Saving…</>
            ) : saveStatus === "saved" ? (
              <><span className="material-symbols-outlined text-lg">check_circle</span> Saved</>
            ) : (
              <>Save Financials <span className="material-symbols-outlined">arrow_forward</span></>
            )}
          </button>
        </div>
      </footer>

      {/* Toast */}
      {toastMessage && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-6 py-3 rounded-lg font-bold text-sm backdrop-blur-xl border transition-all duration-300 ${
          saveStatus === "error"
            ? "bg-error/20 border-error/30 text-error"
            : "bg-primary/20 border-primary/30 text-primary"
        }`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
