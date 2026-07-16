'use client';

import React, { useState, useEffect } from 'react';
import type { Project } from '@/types/schema';
import { projectsService } from '@/lib/firebase/deals';
import toast from 'react-hot-toast';
import { Landmark, TrendingUp, Key } from 'lucide-react';

interface DeclareStrategyPanelProps {
  project: Project;
  onSaveSuccess: () => void;
}

export function DeclareStrategyPanel({
  project,
  onSaveSuccess,
}: DeclareStrategyPanelProps) {
  const selectedDisp = project.dispositionType;
  const selectedSub = project.subStrategy;

  const [isEditing, setIsEditing] = useState(!project.dispositionType);
  const [holdHorizon, setHoldHorizon] = useState<number | undefined>(project.holdHorizon ?? undefined);
  const [exitAssumption, setExitAssumption] = useState<string>(project.exitAssumption || '');

  useEffect(() => {
    if (!project.dispositionType) {
      setIsEditing(true);
    }
  }, [project.dispositionType]);

  useEffect(() => {
    setHoldHorizon(project.holdHorizon ?? undefined);
    setExitAssumption(project.exitAssumption || '');
  }, [project.holdHorizon, project.exitAssumption]);

  const dispositions = [
    {
      id: 'SALE',
      label: 'Sale',
      description: 'Acquire to sell the property (e.g., Fix & Flip, Wholesale)',
      icon: TrendingUp,
      subStrategies: [
        { id: 'FLIP', label: 'Fix & Flip' },
        { id: 'WHOLESALE', label: 'Wholesale' },
        { id: 'BUILD_SELL', label: 'Build & Sell' },
      ],
    },
    {
      id: 'RENT',
      label: 'Rent',
      description: 'Acquire to lease out for rental cash flow (e.g., BRRRR, Long Term)',
      icon: Landmark,
      subStrategies: [
        { id: 'LONG_TERM', label: 'Long Term' },
        { id: 'SHORT_TERM', label: 'Short Term' },
        { id: 'MID_TERM', label: 'Mid Term' },
        { id: 'BRRRR', label: 'BRRRR' },
      ],
    },
    {
      id: 'LEASE',
      label: 'Lease',
      description: 'Commercial or ground leasing strategy (e.g., Triple Net NNN)',
      icon: Key,
      subStrategies: [
        { id: 'NNN', label: 'NNN (Triple Net)' },
        { id: 'GROUND', label: 'Ground Lease' },
        { id: 'LEASE_OPTION', label: 'Lease Option' },
      ],
    },
  ] as const;

  const handleSelect = async (disp: 'SALE' | 'RENT' | 'LEASE', sub: string | null) => {
    if (!isEditing) return;
    try {
      await projectsService.updateProject(project.id, {
        dispositionType: disp,
        subStrategy: sub as any,
      });

      // Optimistic sync trigger for local postgres DB
      const token = (window as any).firebaseUserToken || '';
      await fetch(`/api/reil/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          dispositionType: disp,
          subStrategy: sub,
        }),
      });

      toast.success('Strategy declared successfully!');
      onSaveSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save strategy.');
    }
  };

  const handleSaveAdditionalFields = async (newHorizon = holdHorizon, newExit = exitAssumption) => {
    if (!isEditing) return;
    try {
      await projectsService.updateProject(project.id, {
        holdHorizon: newHorizon !== undefined ? Number(newHorizon) : undefined,
        exitAssumption: newExit || undefined,
      });

      // Sync to Postgres
      const token = (window as any).firebaseUserToken || '';
      await fetch(`/api/reil/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          holdHorizon: newHorizon !== undefined ? Number(newHorizon) : null,
          exitAssumption: newExit || null,
        }),
      });
      onSaveSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save exit fields.');
    }
  };

  return (
    <div
      className="p-6 rounded-2xl flex flex-col gap-6"
      style={{
        background: 'var(--color-surface-container-low)',
        border: '1px solid var(--color-glass-card-border)',
        boxShadow: 'var(--color-glass-card-shadow)',
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-on-surface)' }}>
            Declare Strategy
          </h3>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>
            Select the canonical disposition type and matching investment sub-strategy.
          </p>
        </div>
        {project.dispositionType && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
            id="edit-strategy-btn"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      {/* Dispositions Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dispositions.map((disp) => {
          const Icon = disp.icon;
          const isSelected = selectedDisp === disp.id;
          return (
            <div
              key={disp.id}
              onClick={() => isEditing && handleSelect(disp.id, null)}
              className={`p-4 rounded-xl flex flex-col gap-3 transition-all ${
                !isEditing ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:scale-[1.01]'
              }`}
              style={{
                background: isSelected
                  ? 'var(--color-primary-container)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: isSelected
                  ? '2px solid var(--color-primary)'
                  : '1px solid var(--color-glass-card-border)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: isSelected ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)',
                  }}
                >
                  <Icon size={18} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--color-on-surface)' }}>
                  {disp.label}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
                {disp.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Sub Strategies list */}
      {selectedDisp && (
        <div className="flex flex-col gap-3 pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-on-surface-variant)' }}>
            Choose Sub-Strategy
          </span>
          <div className="flex flex-wrap gap-2">
            {dispositions
              .find((d) => d.id === selectedDisp)
              ?.subStrategies.map((sub) => {
                const isSelected = selectedSub === sub.id;
                return (
                  <button
                    key={sub.id}
                    disabled={!isEditing}
                    onClick={() => handleSelect(selectedDisp, sub.id)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg transition-all"
                    style={{
                      background: isSelected ? 'var(--color-primary)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? 'var(--color-on-primary)' : 'var(--color-on-surface)',
                      border: isSelected
                        ? '1px solid var(--color-primary)'
                        : '1px solid var(--color-glass-card-border)',
                      cursor: isEditing ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {sub.label}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Hold Horizon & Exit Assumption */}
      {selectedDisp && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
              Hold Horizon (Years)
            </label>
            <input
              type="number"
              disabled={!isEditing}
              value={holdHorizon ?? ''}
              onChange={(e) => setHoldHorizon(e.target.value ? parseInt(e.target.value) : undefined)}
              onBlur={() => handleSaveAdditionalFields()}
              placeholder="e.g. 5"
              className="w-full p-3 rounded-lg text-sm bg-black/30 border border-white/10 text-white focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              id="hold-horizon-input"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#9E9DA0]">
              Exit Assumption
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={exitAssumption}
              onChange={(e) => setExitAssumption(e.target.value)}
              onBlur={() => handleSaveAdditionalFields()}
              placeholder="e.g. 6.5% exit cap rate"
              className="w-full p-3 rounded-lg text-sm bg-black/30 border border-white/10 text-white focus:outline-none focus:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              id="exit-assumption-input"
            />
          </div>
        </div>
      )}
    </div>
  );
}
