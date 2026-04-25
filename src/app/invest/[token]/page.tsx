'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, XCircle, Clock, Shield, FileText, DollarSign, TrendingUp, Home, Pen } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Guest Portal — External Investor View

   Isolated public route. No dashboard chrome.
   Renders: Deal Summary, Pre-filled LOI, Signature Canvas,
   Accept / Decline CTAs, and PaperWorking branding.
   ═══════════════════════════════════════════════════════ */

// Mock token data — in production, this would be fetched from the API
const MOCK_TOKEN_DATA: Record<string, {
  investorName: string;
  investorEmail: string;
  dealName: string;
  propertyAddress: string;
  purchasePrice: number;
  estimatedARV: number;
  expectedROI: number;
  investmentAmount: number;
  equitySplit: number;
  termMonths: number;
  interestRate: number;
  legalEntity: string;
  expiresAt: string;
  status: 'active' | 'used' | 'expired';
}> = {
  'demo-token-001': {
    investorName: 'Sarah Johnson',
    investorEmail: 'sarah@example.com',
    dealName: '1422 N Oak St Flip',
    propertyAddress: '1422 N Oak St, Atlanta, GA 30306',
    purchasePrice: 200000,
    estimatedARV: 340000,
    expectedROI: 32,
    investmentAmount: 50000,
    equitySplit: 25,
    termMonths: 12,
    interestRate: 8,
    legalEntity: 'Sunrise Capital Holdings LLC',
    expiresAt: '2026-06-01',
    status: 'active',
  },
};

export default function GuestPortalPage() {
  const params = useParams();
  const token = params?.token as string;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);

  const dealData = MOCK_TOKEN_DATA[token];

  // ── Canvas Signature Logic ────────────────────────────
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSigned(true);
  }, [isDrawing]);

  const stopDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  const handleSign = () => {
    setSubmitted(true);
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  // ── Invalid / Expired Token ──────────────────────────
  if (!dealData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-text-secondary">
            This investment portal link is no longer valid. Please contact the deal sponsor for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // ── Declined State ──────────────────────────────────
  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-text-secondary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Offer Declined</h1>
          <p className="text-sm text-text-secondary">
            You have declined this investment opportunity. The deal sponsor has been notified.
          </p>
        </div>
      </div>
    );
  }

  // ── Submitted State ──────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Commitment Confirmed!</h1>
          <p className="text-sm text-text-secondary mb-4">
            Your digital signature has been recorded. The deal sponsor will follow up with the formal subscription agreement.
          </p>
          <div className="bg-bg-surface rounded-xl border border-border-accent p-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Investment:</span>
                <span className="font-semibold">${dealData.investmentAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Equity:</span>
                <span className="font-semibold">{dealData.equitySplit}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status:</span>
                <span className="font-semibold text-emerald-600">Signed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Portal View ──────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Minimal Header */}
      <header className="bg-bg-surface border-b border-border-accent px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">PW</span>
            </div>
            <span className="text-sm font-semibold text-text-primary tracking-tight">PaperWorking</span>
          </div>
          <span className="text-xs text-text-secondary">Secure Investor Portal</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-sm text-text-secondary mb-1">Hello, {dealData.investorName}</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Investment Opportunity</h1>
        </div>

        {/* Deal Summary Card */}
        <div className="bg-bg-surface rounded-2xl border border-border-accent overflow-hidden shadow-sm">
          <div className="h-28 bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center">
            <Home className="w-10 h-10 text-teal-300" />
          </div>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-text-primary">{dealData.dealName}</h2>
            <p className="text-sm text-text-secondary mb-4">{dealData.propertyAddress}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-primary rounded-xl px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-0.5">Target Price</p>
                <p className="text-sm font-bold text-text-primary">${dealData.purchasePrice.toLocaleString()}</p>
              </div>
              <div className="bg-bg-primary rounded-xl px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-widest mb-0.5">ARV</p>
                <p className="text-sm font-bold text-text-primary">${dealData.estimatedARV.toLocaleString()}</p>
              </div>
              <div className="bg-teal-50 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-widest mb-0.5">Expected ROI</p>
                <p className="text-sm font-bold text-teal-800">{dealData.expectedROI}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* LOI Preview */}
        <div className="bg-bg-surface rounded-2xl border border-border-accent p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-text-primary">Letter of Intent — Terms</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Legal Entity', value: dealData.legalEntity },
              { label: 'Investment Amount', value: `$${dealData.investmentAmount.toLocaleString()}` },
              { label: 'Equity Split', value: `${dealData.equitySplit}%` },
              { label: 'Interest Rate', value: `${dealData.interestRate}% per annum` },
              { label: 'Term Length', value: `${dealData.termMonths} months` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-gray-50 last:border-b-0">
                <span className="text-sm text-text-secondary">{item.label}</span>
                <span className="text-sm font-semibold text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-secondary mt-4 leading-relaxed">
            This Letter of Intent is non-binding and subject to the execution of a definitive subscription agreement.
            By signing below, you indicate your intent to proceed under the terms outlined above.
          </p>
        </div>

        {/* Signature Canvas */}
        <div className="bg-bg-surface rounded-2xl border border-border-accent p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pen className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-text-primary">Digital Signature</h3>
            </div>
            {hasSigned && (
              <button
                onClick={clearSignature}
                className="text-xs text-text-secondary hover:text-text-secondary transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative border-2 border-dashed border-border-accent rounded-xl overflow-hidden bg-bg-primary/50">
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className="w-full cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-gray-300">Sign here</p>
              </div>
            )}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleSign}
            disabled={!hasSigned}
            className="w-full py-4 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:bg-gray-200 disabled:text-text-secondary disabled:cursor-not-allowed transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Digitally Sign & Commit Funds
          </button>
          <button
            onClick={handleDecline}
            className="w-full py-3 bg-bg-surface text-text-secondary text-sm font-medium rounded-xl border border-border-accent hover:bg-bg-primary hover:text-text-primary transition"
          >
            Decline Offer
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-accent bg-bg-surface mt-12 py-6 px-4 text-center">
        <p className="text-xs text-text-secondary">
          Powered by <strong className="text-text-secondary">PaperWorking</strong> · Secure Investment Portal
        </p>
      </footer>
    </div>
  );
}
