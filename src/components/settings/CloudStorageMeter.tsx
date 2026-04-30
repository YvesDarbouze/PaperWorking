'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProjectStore } from '@/store/projectStore';
import { HardDrive, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const PLAN_LIMITS_GB: Record<string, number> = {
  'Individual': 5.0,
  'Team': 50.0,
  'Lawyer Lead-Gen': 10.0,
  'None': 1.0,
};

// Mocking 2.5MB per document across the system
const AVG_DOC_SIZE_MB = 2.5;

export function CloudStorageMeter() {
  const { profile } = useAuth();
  const projects = useProjectStore(state => state.projects);
  const settlementDocuments = useProjectStore(state => state.ledgerItems); // This isn't exactly where settlement docs are, let's check store

  const plan = profile?.subscriptionPlan ?? 'None';
  const limitGB = PLAN_LIMITS_GB[plan] || 1.0;
  
  // Aggregate real file sizes across all potential document locations
  let totalSizeBytes = 0;
  
  projects.forEach(p => {
    // 1. Role Linked Documents (Project Vault)
    p.roleLinkedDocuments?.forEach(doc => {
      totalSizeBytes += doc.fileSize || (AVG_DOC_SIZE_MB * 1024 * 1024);
    });

    // 2. Purchase Readiness Documents
    p.purchaseReadinessChecklist?.forEach(item => {
      if (item.documentUrl) {
        totalSizeBytes += item.fileSize || (AVG_DOC_SIZE_MB * 1024 * 1024);
      }
    });

    // 3. Closing Checklist Documents
    p.closingChecklist?.forEach(item => {
      if (item.documentUrl) {
        totalSizeBytes += item.fileSize || (AVG_DOC_SIZE_MB * 1024 * 1024);
      }
    });

    // 4. Financial Documents (Settlement Statements)
    p.settlementDocuments?.forEach(doc => {
      totalSizeBytes += doc.fileSize || (AVG_DOC_SIZE_MB * 1024 * 1024);
    });
  });

  const usageGB = totalSizeBytes / (1024 * 1024 * 1024);
  const usagePercent = Math.min((usageGB / limitGB) * 100, 100);
  const isNearLimit = usagePercent > 90;

  // Colors per requirements
  const trackColor = "#CCCCCC";
  const fillColor = isNearLimit ? "#DC2626" : "#595959"; // Using red-600 for warning

  return (
    <section className="bg-white border border-border-accent p-8 flex flex-col mt-8 rounded-[8px]">
      <div className="flex items-center gap-2 mb-6">
        <HardDrive className="w-5 h-5 text-[#595959]" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#595959]">
          Cloud Storage Meter
        </h2>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div>
          <span className="text-3xl font-light text-[#595959]">
            {usageGB.toFixed(2)} GB
          </span>
          <span className="text-base text-[#7F7F7F] ml-2">
            of {limitGB.toFixed(0)} GB total
          </span>
        </div>
        <span className={`text-sm font-bold ${isNearLimit ? 'text-red-600' : 'text-[#7F7F7F]'}`}>
          {usagePercent.toFixed(1)}% CAPACITY
        </span>
      </div>

      {/* Progress Bar per requirements: #CCCCCC track, #595959 fill */}
      <div 
        className="w-full h-3 overflow-hidden mb-6" 
        style={{ backgroundColor: trackColor, borderRadius: '4px' }}
      >
        <div 
          className="h-full transition-all duration-700 ease-in-out"
          style={{ 
            width: `${usagePercent}%`, 
            backgroundColor: fillColor,
            boxShadow: isNearLimit ? '0 0 10px rgba(220, 38, 38, 0.2)' : 'none'
          }}
        />
      </div>

      {isNearLimit ? (
        <div className="flex items-start gap-4 bg-red-50 border border-red-100 p-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-bold">Storage Threshold Warning</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">
              Your organization has consumed over 90% of its institutional storage allocation. 
              To prevent document upload interruptions, please upgrade to a higher tier.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#7F7F7F] mb-6 leading-relaxed max-w-2xl font-medium">
          The Cloud Storage Meter aggregates all transactional documents, legal contracts, 
          and financial disclosures stored across your project vaults.
        </p>
      )}

      <div className="flex gap-4">
        {isNearLimit && (
          <button 
            className="inline-flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition"
          >
            UPGRADE CAPACITY <ArrowRight className="w-4 h-4" />
          </button>
        )}
        <button 
          className="inline-flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 border border-[#CCCCCC] text-[#595959] hover:bg-gray-50 transition"
        >
          VIEW DOCUMENT AUDIT
        </button>
      </div>
    </section>
  );
}
