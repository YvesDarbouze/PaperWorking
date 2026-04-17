'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, Zap, CheckCircle, ArrowRight } from 'lucide-react';

/**
 * ValueDemo
 *
 * A 3-step interactive animation illustrating the core product value:
 *   Step 1 → Messy Document (scattered fields, handwriting chaos)
 *   Step 2 → Upload & AI Processing (scanning animation)
 *   Step 3 → Clean Digital Dashboard (structured data)
 *
 * Uses strict PaperWorking palette. Users can click through steps
 * or let it auto-advance on a timer.
 */

const steps = [
  {
    id: 1,
    label: 'The Problem',
    sublabel: 'Manual paperwork chaos',
    icon: FileText,
  },
  {
    id: 2,
    label: 'Upload & Process',
    sublabel: 'AI reads your documents',
    icon: Upload,
  },
  {
    id: 3,
    label: 'Instant Clarity',
    sublabel: 'Clean, actionable data',
    icon: Zap,
  },
];

function MessyDocument() {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-6">
      {/* Scattered paper sheets */}
      <div className="relative w-full max-w-xs">
        {/* Background sheet — rotated */}
        <div className="absolute -top-2 -left-3 w-full h-48 bg-white border border-phase-1 shadow-sm rotate-[-4deg] opacity-60" />
        <div className="absolute -top-1 left-2 w-full h-48 bg-white border border-phase-1 shadow-sm rotate-[2deg] opacity-80" />

        {/* Main messy form */}
        <div className="relative bg-white border border-phase-1 shadow-sm p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-2 w-24 bg-phase-1 rounded-full" />
              <div className="h-2 w-12 bg-phase-1 rounded-full opacity-50" />
            </div>
            {/* Simulated messy handwritten fields */}
            <div className="h-6 w-full border-b border-dashed border-phase-1 relative">
              <svg viewBox="0 0 200 20" className="absolute inset-0 w-full h-full text-phase-3 opacity-70">
                <path d="M5,15 Q20,5 40,12 T80,10 T120,14 T160,8 T195,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="h-6 w-3/4 border-b border-dashed border-phase-1 relative">
              <svg viewBox="0 0 150 20" className="absolute inset-0 w-full h-full text-phase-3 opacity-60">
                <path d="M5,12 Q15,8 35,14 T75,10 T110,15 T145,9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="h-6 w-5/6 border-b border-dashed border-phase-1 relative">
              <svg viewBox="0 0 170 20" className="absolute inset-0 w-full h-full text-phase-3 opacity-50">
                <path d="M5,10 Q25,16 50,8 T100,14 T140,7 T165,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex gap-3 mt-2">
              <div className="h-8 w-20 bg-dashboard border border-phase-1" />
              <div className="h-8 w-20 bg-dashboard border border-phase-1" />
            </div>
            {/* Red "X" marks and scribbles */}
            <div className="flex items-center gap-2 text-phase-2">
              <span className="text-xs font-bold uppercase tracking-widest">Missing: 3 fields</span>
              <span className="text-xs">•</span>
              <span className="text-xs font-bold uppercase tracking-widest">Illegible: 2 entries</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessingAnimation() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        {/* Upload indicator */}
        <div className="flex items-center justify-center">
          <div className={`w-16 h-16 bg-black flex items-center justify-center transition-all duration-500 ${progress > 50 ? 'scale-110' : ''}`}>
            <Upload className={`w-6 h-6 text-white transition-all duration-300 ${progress > 50 ? 'opacity-0 scale-75' : 'opacity-100'}`} />
            <Zap className={`w-6 h-6 text-white absolute transition-all duration-300 ${progress > 50 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-dashboard overflow-hidden">
            <div
              className="h-full bg-phase-4 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-phase-2">
            <span>Processing document…</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>

        {/* Extracted fields appearing one by one */}
        <div className="space-y-2">
          {[
            { label: 'Property Address', value: '421 Oak St, Brooklyn', threshold: 25 },
            { label: 'Purchase Price', value: '$420,000', threshold: 45 },
            { label: 'Seller Entity', value: 'Apex Holdings LLC', threshold: 65 },
            { label: 'Closing Date', value: '2026-05-15', threshold: 85 },
          ].map((field) => (
            <div
              key={field.label}
              className={`flex items-center justify-between py-1.5 px-3 border transition-all duration-300 ${
                progress >= field.threshold
                  ? 'border-phase-1 bg-white opacity-100 translate-y-0'
                  : 'border-transparent bg-transparent opacity-0 translate-y-2'
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-widest text-phase-2">{field.label}</span>
              <span className="text-xs font-medium text-phase-4">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CleanDashboard() {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-6">
      <div className="w-full max-w-xs">
        <div className="bg-white border border-phase-1 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-dashboard bg-dashboard flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3.5 h-3.5 text-phase-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-phase-3">Deal Created</span>
            </div>
            <span className="text-xs text-phase-2">Auto-populated</span>
          </div>

          {/* Clean structured data */}
          <div className="divide-y divide-dashboard">
            {[
              { label: 'Property', value: '421 Oak St, Brooklyn, NY' },
              { label: 'Purchase Price', value: '$420,000' },
              { label: 'Seller', value: 'Apex Holdings LLC' },
              { label: 'Target Close', value: 'May 15, 2026' },
              { label: 'ARV Projection', value: '$615,000' },
              { label: 'Est. ROI', value: '34.2%' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs font-bold uppercase tracking-widest text-phase-2">{row.label}</span>
                <span className="text-xs font-medium text-phase-4 tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div className="px-4 py-2.5 bg-dashboard border-t border-phase-1 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-phase-4 rounded-full" />
              <span className="text-xs font-bold uppercase tracking-widest text-phase-3">Phase 1 — Find & Fund</span>
            </div>
            <span className="text-xs text-phase-4 font-bold">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ValueDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Auto-advance every 3.5 seconds
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, [autoPlay]);

  const handleStepClick = useCallback((index: number) => {
    setAutoPlay(false);
    setActiveStep(index);
  }, []);

  return (
    <div className="w-full">
      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-1 mb-6">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = i === activeStep;
          const isComplete = i < activeStep;
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => handleStepClick(i)}
                className={`flex items-center space-x-2 px-4 py-2.5 transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-black text-white'
                    : isComplete
                    ? 'bg-phase-4 text-white'
                    : 'bg-dashboard text-phase-3 hover:bg-phase-1'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">{step.label}</span>
              </button>
              {i < steps.length - 1 && (
                <ArrowRight className="w-3 h-3 text-phase-2 mx-1 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step Sublabel */}
      <p className="text-center text-xs text-phase-2 mb-4">
        {steps[activeStep].sublabel}
      </p>

      {/* Step Content */}
      <div className="relative w-full h-72 bg-dashboard border border-phase-1 overflow-hidden">
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: activeStep === 0 ? 1 : 0, pointerEvents: activeStep === 0 ? 'auto' : 'none' }}>
          <MessyDocument />
        </div>
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: activeStep === 1 ? 1 : 0, pointerEvents: activeStep === 1 ? 'auto' : 'none' }}>
          {activeStep === 1 && <ProcessingAnimation />}
        </div>
        <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: activeStep === 2 ? 1 : 0, pointerEvents: activeStep === 2 ? 'auto' : 'none' }}>
          <CleanDashboard />
        </div>
      </div>
    </div>
  );
}
