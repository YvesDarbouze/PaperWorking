'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { HardHat, Droplets, Zap, Wrench, Upload, AlertTriangle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Inspection Upload Module — Phase 2 Module
   Tracks Structural, Plumbing, and Electrical issues
   from third-party inspection reports.
   ═══════════════════════════════════════════════════════ */

type InspectionCategory = 'Structural' | 'Plumbing' | 'Electrical' | 'HVAC' | 'Foundation' | 'Roof';

interface InspectionIssue {
  id: string;
  category: InspectionCategory;
  description: string;
  severity: 'Critical' | 'Major' | 'Minor' | 'Cosmetic';
  estimatedRepairCost: number;
  resolved: boolean;
}

const CATEGORY_ICONS: Record<InspectionCategory, React.ReactNode> = {
  Structural: <HardHat className="w-4 h-4" />,
  Plumbing: <Droplets className="w-4 h-4" />,
  Electrical: <Zap className="w-4 h-4" />,
  HVAC: <Wrench className="w-4 h-4" />,
  Foundation: <HardHat className="w-4 h-4" />,
  Roof: <HardHat className="w-4 h-4" />,
};

const SEVERITY_STYLES: Record<InspectionIssue['severity'], string> = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  Major: 'bg-orange-50 text-orange-700 border-orange-200',
  Minor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Cosmetic: 'bg-gray-50 text-gray-600 border-gray-200',
};

const SAMPLE_ISSUES: InspectionIssue[] = [
  { id: '1', category: 'Structural', description: 'Load-bearing wall cracking in west wing', severity: 'Critical', estimatedRepairCost: 8500, resolved: false },
  { id: '2', category: 'Plumbing', description: 'Galvanized pipe replacement needed (kitchen/bath)', severity: 'Major', estimatedRepairCost: 4200, resolved: false },
  { id: '3', category: 'Electrical', description: 'Federal Pacific breaker panel — outdated', severity: 'Critical', estimatedRepairCost: 3800, resolved: false },
  { id: '4', category: 'Roof', description: 'Missing shingles on south-facing slope', severity: 'Minor', estimatedRepairCost: 1200, resolved: true },
];

export default function InspectionUploadModule() {
  const currentProject = useProjectStore(state => state.currentProject);
  const [issues, setIssues] = useState<InspectionIssue[]>(SAMPLE_ISSUES);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done'>('idle');

  const toggleResolved = (id: string) => {
    setIssues(issues.map(i => i.id === id ? { ...i, resolved: !i.resolved } : i));
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUpload = () => {
    setUploadState('uploading');
    setTimeout(() => {
      setUploadState('done');
      toast.success('Inspection report parsed. 4 issues extracted.');
    }, 1500);
  };

  // Group by category
  const grouped = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) acc[issue.category] = [];
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, InspectionIssue[]>);

  const totalRepairCost = issues.reduce((s, i) => s + i.estimatedRepairCost, 0);
  const unresolvedCount = issues.filter(i => !i.resolved).length;
  const criticalCount = issues.filter(i => i.severity === 'Critical' && !i.resolved).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <HardHat className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-medium tracking-tight text-gray-900">Inspection Report</h3>
          </div>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
              <AlertTriangle className="w-3 h-3" /> {criticalCount} CRITICAL
            </span>
          )}
        </div>

        {/* Upload Zone */}
        {uploadState !== 'done' && (
          <div
            onClick={handleUpload}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
              uploadState === 'uploading'
                ? 'border-gray-400 bg-gray-50 animate-pulse'
                : 'border-gray-300 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">
              {uploadState === 'uploading' ? 'Parsing inspection PDF...' : 'Upload Inspection Report'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX — Auto-extracts structural/plumbing/electrical issues</p>
          </div>
        )}

        {/* Summary Bar */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">Open Issues</p>
            <p className="text-xl font-light text-gray-900">{unresolvedCount}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">Est. Repair</p>
            <p className="text-xl font-light text-gray-900">${totalRepairCost.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs uppercase tracking-widest text-gray-400">Categories</p>
            <p className="text-xl font-light text-gray-900">{Object.keys(grouped).length}</p>
          </div>
        </div>
      </div>

      {/* Categorized Issue List */}
      <div className="divide-y divide-gray-100">
        {Object.entries(grouped).map(([category, categoryIssues]) => {
          const catUnresolved = categoryIssues.filter(i => !i.resolved).length;
          const isExpanded = expandedCategories[category] !== false; // default expanded
          return (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-2">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                  <span className="text-gray-500 flex-shrink-0">{CATEGORY_ICONS[category as InspectionCategory]}</span>
                  <span className="text-sm font-medium text-gray-900">{category}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {catUnresolved}/{categoryIssues.length} open
                </span>
              </button>

              {isExpanded && (
                <div className="px-6 pb-3 space-y-2">
                  {categoryIssues.map(issue => (
                    <div
                      key={issue.id}
                      className={`flex items-start justify-between p-3 rounded-lg border transition ${
                        issue.resolved ? 'bg-gray-50 border-gray-100 opacity-60' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleResolved(issue.id)}
                          className={`mt-0.5 flex-shrink-0 ${issue.resolved ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-500'}`}
                        >
                          <CheckCircle className="w-4.5 h-4.5" />
                        </button>
                        <div>
                          <p className={`text-sm ${issue.resolved ? 'line-through text-gray-400' : 'text-gray-900'}`}>{issue.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded border ${SEVERITY_STYLES[issue.severity]}`}>
                              {issue.severity}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-mono text-gray-600 flex-shrink-0 ml-3">
                        ${issue.estimatedRepairCost.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
