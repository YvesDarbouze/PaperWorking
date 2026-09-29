'use client';

import React, { useState } from 'react';
import { formatCurrency } from '@/lib/projects/phase-utils';
import type {
  ProjectWorkspace,
  StabilizationReadiness,
  PropertyManagerHoldDetails,
  SiteSecurityHoldDetails,
  RoutineMaintenanceHoldItem,
} from '@/lib/projects/types';
import AssignOrInviteModal, { type AssigneeOption } from '../AssignOrInviteModal';
import VendorMarketplaceSuggestions from '../fund/VendorMarketplaceSuggestions';
import TeamTierUpgradeModal from '../fund/TeamTierUpgradeModal';

export interface HoldAssetManagementTasksProps {
  project: ProjectWorkspace;
  stabilization: StabilizationReadiness;
  onUpdateStabilization: (details: StabilizationReadiness) => void;
  propertyManager: PropertyManagerHoldDetails;
  onUpdatePropertyManager: (details: PropertyManagerHoldDetails) => void;
  siteSecurity: SiteSecurityHoldDetails;
  onUpdateSiteSecurity: (details: SiteSecurityHoldDetails) => void;
  routineMaintenance: RoutineMaintenanceHoldItem[];
  onUpdateRoutineMaintenance: (items: RoutineMaintenanceHoldItem[]) => void;
  userTier?: string;
  propertyState?: string;
  activeRoster?: AssigneeOption[];
  onUpdateProject?: (updated: ProjectWorkspace) => void;
}

export default function HoldAssetManagementTasks({
  project,
  stabilization,
  onUpdateStabilization,
  propertyManager,
  onUpdatePropertyManager,
  siteSecurity,
  onUpdateSiteSecurity,
  routineMaintenance,
  onUpdateRoutineMaintenance,
  userTier = 'Investment Team',
  propertyState = 'TX',
  activeRoster = [],
  onUpdateProject,
}: HoldAssetManagementTasksProps) {
  const isTeamTier = userTier.toLowerCase().includes('team') || userTier.toLowerCase().includes('enterprise');

  // Modal states
  const [activeVendorTrade, setActiveVendorTrade] = useState<string | null>(null);
  const [vendorTaskTitle, setVendorTaskTitle] = useState<string>('');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeTaskTitle, setUpgradeTaskTitle] = useState('');
  const [assignModalTask, setAssignModalTask] = useState<{ id: string; title: string; currentAssignee?: string } | null>(null);

  const handleOpenAssign = (taskKey: string, taskTitle: string, currentAssignee?: string) => {
    if (!isTeamTier) {
      setUpgradeTaskTitle(taskTitle);
      setIsUpgradeModalOpen(true);
      return;
    }
    setAssignModalTask({ id: taskKey, title: taskTitle, currentAssignee });
  };

  const handleOpenVendor = (trade: string, taskTitle: string) => {
    setActiveVendorTrade(trade);
    setVendorTaskTitle(taskTitle);
  };

  const totalMonthlyRoutineSpend = routineMaintenance.reduce((acc, m) => {
    if (m.status !== 'active') return acc;
    if (m.frequency === 'weekly') return acc + m.costPerVisit * 4;
    if (m.frequency === 'biweekly') return acc + m.costPerVisit * 2;
    if (m.frequency === 'monthly') return acc + m.costPerVisit;
    if (m.frequency === 'quarterly') return acc + Math.round(m.costPerVisit / 3);
    return acc + Math.round(m.costPerVisit / 6);
  }, 0);

  return (
    <div className="space-y-6" data-testid="hold-asset-management-tasks">
      {/* Pillar Header Card */}
      <div className="border border-neutral-800 bg-neutral-950 p-5 rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-mono text-sky-400 font-bold uppercase rounded-none">
                Pillar 03: Asset & Property Management
              </span>
              <span className="text-xs font-mono text-neutral-400">4 Core Activities</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              Property Stabilization, Security, Property Manager & Upkeep
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Clear certificate of occupancy, oversee third-party property managers, protect vacant assets, and schedule seasonal upkeep.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-right rounded-none">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Stabilization Status</span>
              <span className={`text-xs font-bold font-mono uppercase ${stabilization.readyForMarketing ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stabilization.readyForMarketing ? 'Ready for Market' : 'In Stabilization'}
              </span>
            </div>
            <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-right rounded-none">
              <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Monthly Maintenance</span>
              <span className="text-xs font-bold font-mono text-white">{formatCurrency(totalMonthlyRoutineSpend)}/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task 15: Property Stabilization Preparation */}
      <section
        data-testid="task-card-stabilization"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">Activity 15</span>
              <span className="text-xs font-bold text-white">Property Stabilization Preparation</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Transition the asset from a construction site to a rentable or salable entity.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('stabilization', 'Property Stabilization Preparation')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Staging Lead
          </button>
        </div>

        <div className="border-l-2 border-sky-400 bg-sky-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-sky-300 font-semibold block mb-0.5">Why this matters:</strong>
          You cannot legally execute tenant leases or close with an end-buyer without an official Certificate of Occupancy (CO) from the municipal building department.
          <span className="block mt-1 font-mono text-[11px] text-sky-200">
            PaperWorking Benchmark: Finish all punch list items before requesting city final inspections. Professional post-construction cleaning and furniture staging increase rents by 8% to 12%.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Certificate of Occupancy (CO)</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white font-mono">{stabilization.certificateOfOccupancyObtained ? 'CO Issued' : 'Pending City Final'}</span>
              <button
                type="button"
                onClick={() => onUpdateStabilization({
                  ...stabilization,
                  certificateOfOccupancyObtained: !stabilization.certificateOfOccupancyObtained,
                  coDate: !stabilization.certificateOfOccupancyObtained ? new Date().toISOString().slice(0, 10) : undefined,
                })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  stabilization.certificateOfOccupancyObtained
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {stabilization.certificateOfOccupancyObtained ? 'Verified' : 'Mark Obtained'}
              </button>
            </div>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Remaining Punch List</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={stabilization.punchListRemainingCount}
                onChange={(e) => onUpdateStabilization({ ...stabilization, punchListRemainingCount: Number(e.target.value) })}
                className="w-20 min-h-[36px] border border-neutral-700 bg-neutral-900 px-2 py-1 text-white font-mono text-xs rounded-none"
              />
              <span className="text-neutral-400 text-[11px]">Items Unresolved</span>
            </div>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Post-Construction Deep Clean</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white">{stabilization.deepCleaningCompleted ? 'Completed' : 'Pending'}</span>
              <button
                type="button"
                onClick={() => onUpdateStabilization({ ...stabilization, deepCleaningCompleted: !stabilization.deepCleaningCompleted })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  stabilization.deepCleaningCompleted
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {stabilization.deepCleaningCompleted ? 'Done' : 'Mark Cleaned'}
              </button>
            </div>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Professional Staging</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white">{stabilization.stagingCompleted ? 'Staged' : 'Unstaged'}</span>
              <button
                type="button"
                onClick={() => onUpdateStabilization({
                  ...stabilization,
                  stagingCompleted: !stabilization.stagingCompleted,
                  readyForMarketing: !stabilization.stagingCompleted && stabilization.certificateOfOccupancyObtained,
                })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  stabilization.stagingCompleted
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {stabilization.stagingCompleted ? 'Done' : 'Mark Staged'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Task 16: Property Manager Oversight */}
      <section
        data-testid="task-card-property-manager"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">Activity 16</span>
              <span className="text-xs font-bold text-white">Property Manager Oversight</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Interview, hire, and manage a third-party property management company (if not self-managing).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenVendor('Property Manager', 'Third-Party Property Management')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Request Property Manager
            </button>
            <button
              type="button"
              onClick={() => handleOpenAssign('pm-oversight', 'Property Manager Oversight')}
              className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
            >
              Assign Asset Manager
            </button>
          </div>
        </div>

        <div className="border-l-2 border-sky-400 bg-sky-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-sky-300 font-semibold block mb-0.5">Why this matters:</strong>
          Self-managing saves fees but demands 24/7 emergency availability and tenant screening. Professional managers handle day-to-day operations but charge 8% to 12% of collected rents.
          <span className="block mt-1 font-mono text-[11px] text-sky-200">
            PaperWorking Benchmark: Institutional management typically charges 8% to 10% of collected rent plus a half-month to full-month lease-up fee.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Management Strategy</label>
            <select
              value={propertyManager.isSelfManaged ? 'self' : 'pro'}
              onChange={(e) => onUpdatePropertyManager({ ...propertyManager, isSelfManaged: e.target.value === 'self' })}
              className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
            >
              <option value="self">Self-Managed by Investor ($0/mo)</option>
              <option value="pro">Third-Party Property Management</option>
            </select>
          </div>
          {!propertyManager.isSelfManaged && (
            <>
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Management Firm</label>
                <input
                  type="text"
                  value={propertyManager.companyName}
                  onChange={(e) => onUpdatePropertyManager({ ...propertyManager, companyName: e.target.value })}
                  className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white rounded-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Management Fee (%)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={propertyManager.feePct}
                  onChange={(e) => onUpdatePropertyManager({ ...propertyManager, feePct: Number(e.target.value) })}
                  className="w-full min-h-[44px] border border-neutral-700 bg-neutral-900 px-3 py-2 text-base md:text-xs text-white font-mono rounded-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">Contract Status</label>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-white font-mono">{propertyManager.contractSigned ? 'Contract Executed' : 'Draft / Pending'}</span>
                  <button
                    type="button"
                    onClick={() => onUpdatePropertyManager({ ...propertyManager, contractSigned: !propertyManager.contractSigned })}
                    className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                      propertyManager.contractSigned
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                        : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {propertyManager.contractSigned ? 'Active' : 'Mark Signed'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Task 17: Security and Vacancy Maintenance */}
      <section
        data-testid="task-card-security"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">Activity 17</span>
              <span className="text-xs font-bold text-white">Security & Vacancy Maintenance</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Implement security measures (cameras, locks, lighting) to protect the vacant property from vandalism or theft.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAssign('site-security', 'Security & Vacancy Maintenance')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Assign Security Officer
          </button>
        </div>

        <div className="border-l-2 border-sky-400 bg-sky-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-sky-300 font-semibold block mb-0.5">Why this matters:</strong>
          Vacant job sites are prime targets for copper stripping, appliance theft, and squatter takeovers that cost months in court and tens of thousands in lost revenue.
          <span className="block mt-1 font-mono text-[11px] text-sky-200">
            PaperWorking Benchmark: Install cellular solar security cameras, digital code lockboxes with rotating codes, and schedule weekly physical drive-bys.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Cellular Solar Cameras</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white">{siteSecurity.hasCellularCameras ? 'Live Feed Active' : 'No Cameras'}</span>
              <button
                type="button"
                onClick={() => onUpdateSiteSecurity({ ...siteSecurity, hasCellularCameras: !siteSecurity.hasCellularCameras })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  siteSecurity.hasCellularCameras
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {siteSecurity.hasCellularCameras ? 'Active' : 'Deploy'}
              </button>
            </div>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Smart Lockbox</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white">{siteSecurity.hasSmartLockbox ? 'Code Protected' : 'Manual Key'}</span>
              <button
                type="button"
                onClick={() => onUpdateSiteSecurity({
                  ...siteSecurity,
                  hasSmartLockbox: !siteSecurity.hasSmartLockbox,
                  lockboxCodeLastRotated: new Date().toISOString().slice(0, 10),
                })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  siteSecurity.hasSmartLockbox
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {siteSecurity.hasSmartLockbox ? 'Rotate Code' : 'Install'}
              </button>
            </div>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Motion Floodlights</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white">{siteSecurity.hasMotionLighting ? 'Active' : 'Unlit'}</span>
              <button
                type="button"
                onClick={() => onUpdateSiteSecurity({ ...siteSecurity, hasMotionLighting: !siteSecurity.hasMotionLighting })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  siteSecurity.hasMotionLighting
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {siteSecurity.hasMotionLighting ? 'Active' : 'Enable'}
              </button>
            </div>
          </div>

          <div className="border border-neutral-800 bg-neutral-900/60 p-3 rounded-none">
            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">Squatter Prevention</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white">{siteSecurity.squatterPreventionProtocolActive ? 'Protocol Active' : 'Standard'}</span>
              <button
                type="button"
                onClick={() => onUpdateSiteSecurity({
                  ...siteSecurity,
                  squatterPreventionProtocolActive: !siteSecurity.squatterPreventionProtocolActive,
                  weeklySiteWalkLogged: true,
                })}
                className={`min-h-[36px] px-2 py-0.5 text-[10px] font-bold uppercase font-mono rounded-none border ${
                  siteSecurity.squatterPreventionProtocolActive
                    ? 'border-emerald-600 bg-emerald-950/40 text-emerald-400'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                }`}
              >
                {siteSecurity.squatterPreventionProtocolActive ? 'Locked' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Task 18: Routine Maintenance Scheduling */}
      <section
        data-testid="task-card-routine-maintenance"
        className="border border-neutral-800 bg-neutral-950 p-5 rounded-none space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase">Activity 18</span>
              <span className="text-xs font-bold text-white">Routine Maintenance Scheduling</span>
            </div>
            <p className="text-xs text-neutral-300 mt-1">
              Manage seasonal upkeep like lawn care, snow removal, pest control, and minor repairs during the hold.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenVendor('Maintenance', 'Seasonal Property Upkeep')}
            className="min-h-[44px] px-3 py-1 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white transition rounded-none"
          >
            Request Maintenance Vendor
          </button>
        </div>

        <div className="border-l-2 border-sky-400 bg-sky-950/20 p-3 text-xs text-neutral-300">
          <strong className="text-sky-300 font-semibold block mb-0.5">Why this matters:</strong>
          Overgrown grass triggers city code violation fines ($250 to $500/violation), while unplowed snow creates liability for visiting contractors and lenders.
          <span className="block mt-1 font-mono text-[11px] text-sky-200">
            PaperWorking Benchmark: Budget 1% of property value annually for routine upkeep. Establish bi-weekly lawn mowing, quarterly pest barriers, and seasonal HVAC filter service.
          </span>
        </div>

        <div className="space-y-2">
          {routineMaintenance.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border border-neutral-800 bg-neutral-900/40 p-3 text-xs rounded-none"
            >
              <div>
                <span className="font-bold text-white capitalize">{m.service.replace(/_/g, ' ')}</span>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Provider: {m.provider} | Frequency: {m.frequency}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono mt-0.5">Next Service: {m.nextScheduledDate}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-white block">{formatCurrency(m.costPerVisit)} / visit</span>
                <span className="inline-block mt-0.5 border border-emerald-600 bg-emerald-950/40 px-1.5 py-0.2 text-[9px] font-mono text-emerald-400 uppercase rounded-none">
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vendor Marketplace Modal */}
      {activeVendorTrade && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-2xl border border-neutral-800 bg-[#0c0c0c] p-6 text-neutral-100 rounded-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Licensed Vendor Assistance</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Requesting {activeVendorTrade} for: {vendorTaskTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveVendorTrade(null)}
                className="min-h-[44px] min-w-[44px] text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <VendorMarketplaceSuggestions
              taskTitle={vendorTaskTitle}
              requiredTrade={activeVendorTrade}
              propertyState={propertyState}
              onAssignVendor={() => setActiveVendorTrade(null)}
            />
          </div>
        </div>
      )}

      {/* Team Member Assignment Modal */}
      {assignModalTask && (
        <AssignOrInviteModal
          isOpen={true}
          projectId={project.id}
          projectName={project.propertyName || project.address}
          task={{
            id: assignModalTask.id,
            title: assignModalTask.title,
            assignedTo: assignModalTask.currentAssignee,
            phase: 'hold',
          }}
          currentAssignee={assignModalTask.currentAssignee}
          existingMembers={activeRoster}
          userTier={userTier}
          propertyState={propertyState}
          onClose={() => setAssignModalTask(null)}
          onAssignExisting={(_taskIdOrPhaseKey, _assigneeName) => {
            setAssignModalTask(null);
          }}
          onMemberInvitedAndAssigned={(newMember: AssigneeOption) => {
            if (onUpdateProject) {
              const current = (project.teamMembers || []) as AssigneeOption[];
              onUpdateProject({ ...project, teamMembers: [...current, newMember] });
            }
            setAssignModalTask(null);
          }}
        />
      )}

      {/* Team Tier Upgrade Modal */}
      <TeamTierUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={userTier}
        targetTaskTitle={upgradeTaskTitle}
        onSwitchToVendors={() => {
          setIsUpgradeModalOpen(false);
          setActiveVendorTrade('Property Manager');
          setVendorTaskTitle(upgradeTaskTitle);
        }}
      />
    </div>
  );
}
