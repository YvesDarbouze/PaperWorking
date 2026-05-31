'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Home, Calendar, Users, AlertTriangle, CheckCircle2, XCircle,
  Plus, Trash2, BarChart3, Clock, Building2,
} from 'lucide-react';
import { computeOccupancyRateByDays } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   OCCUPANCY COLLECTION TERMINAL
   Collects tenant/lease data and vacant-day inputs per unit,
   computes occupancy rate = (Days Occupied ÷ Total Days) × 100
   Supports multi-unit tracking with individual vacancy entries.

   Stitch screens:
     40fd1015 - Tenants & Leases: Occupancy Collection (Mobile)
     5d26659a - Tenants & Leases: Occupancy Collection (Desktop)
     fedb8e0a - Tenants & Leases: Occupancy Collection (Mobile) v2
     529657b8 - Tenants & Leases: Occupancy Collection (Desktop) v2
   ═══════════════════════════════════════════════════════════════ */

export interface UnitOccupancy {
  id: string;
  unitLabel: string;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  vacantDays: number;
  status: 'occupied' | 'vacant' | 'notice';
}

export interface OccupancyValues {
  units: UnitOccupancy[];
  totalDays: number;
  occupancyRate: number;
  totalVacantDays: number;
  totalOccupiedDays: number;
  occupiedUnitCount: number;
  totalUnitCount: number;
}

interface OccupancyCollectionTerminalProps {
  defaults?: Partial<{ units: UnitOccupancy[]; totalDays: number }>;
  onValuesChange?: (values: OccupancyValues) => void;
  className?: string;
}

/* ── Seed data matching the spec: 92% / 29 vacant days / 365 total ── */
const SEED_UNITS: UnitOccupancy[] = [
  { id: '1', unitLabel: 'Unit 1A', tenantName: 'J. Rivera', leaseStart: '2025-06-01', leaseEnd: '2026-05-31', vacantDays: 0, status: 'occupied' },
  { id: '2', unitLabel: 'Unit 1B', tenantName: 'M. Chen', leaseStart: '2025-08-01', leaseEnd: '2026-07-31', vacantDays: 0, status: 'occupied' },
  { id: '3', unitLabel: 'Unit 2A', tenantName: '', leaseStart: '', leaseEnd: '', vacantDays: 29, status: 'vacant' },
  { id: '4', unitLabel: 'Unit 2B', tenantName: 'S. Okafor', leaseStart: '2025-04-15', leaseEnd: '2026-04-14', vacantDays: 0, status: 'occupied' },
];

/* ── Status config ── */
const STATUS_CFG = {
  occupied: { icon: CheckCircle2, color: '#14B8A6', bg: 'rgba(20,184,166,0.08)', label: 'Occupied' },
  vacant:   { icon: XCircle,      color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  label: 'Vacant'   },
  notice:   { icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: 'Notice'   },
} as const;

/* ═══════════════════════════════════════════════════════════════
   UNIT ROW
   ═══════════════════════════════════════════════════════════════ */

function UnitRow({
  unit,
  onChange,
  onRemove,
}: {
  unit: UnitOccupancy;
  onChange: (updated: UnitOccupancy) => void;
  onRemove: () => void;
}) {
  const cfg = STATUS_CFG[unit.status];
  const StatusIcon = cfg.icon;

  return (
    <div
      className="rounded-lg border p-3 space-y-2 transition-all"
      style={{ borderColor: `${cfg.color}20`, background: cfg.bg }}
    >
      {/* Top row: status + unit + remove */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cfg.color }} />
          <input
            type="text"
            value={unit.unitLabel}
            onChange={(e) => onChange({ ...unit, unitLabel: e.target.value })}
            className="bg-transparent text-xs font-bold text-white w-20 focus:outline-none border-b border-transparent focus:border-white/20"
            placeholder="Unit #"
          />
          <select
            value={unit.status}
            onChange={(e) => onChange({ ...unit, status: e.target.value as UnitOccupancy['status'] })}
            className="bg-transparent text-[9px] font-bold uppercase tracking-wider rounded px-1 py-0.5 border focus:outline-none cursor-pointer"
            style={{ color: cfg.color, borderColor: `${cfg.color}40` }}
          >
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="notice">Notice</option>
          </select>
        </div>
        <button
          onClick={onRemove}
          className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
          title="Remove unit"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Tenant + Lease */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Tenant</label>
          <input
            type="text"
            value={unit.tenantName}
            onChange={(e) => onChange({ ...unit, tenantName: e.target.value })}
            placeholder="Vacant"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-[11px] text-slate-300
                       focus:outline-none focus:border-teal-500/30 transition-all"
          />
        </div>
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" /> Lease Start
          </label>
          <input
            type="date"
            value={unit.leaseStart}
            onChange={(e) => onChange({ ...unit, leaseStart: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-[11px] text-slate-300
                       focus:outline-none focus:border-teal-500/30 transition-all"
          />
        </div>
        <div>
          <label className="text-[8px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" /> Lease End
          </label>
          <input
            type="date"
            value={unit.leaseEnd}
            onChange={(e) => onChange({ ...unit, leaseEnd: e.target.value })}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-[11px] text-slate-300
                       focus:outline-none focus:border-teal-500/30 transition-all"
          />
        </div>
      </div>

      {/* Vacant Days */}
      <div className="flex items-center gap-2">
        <label className="text-[8px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-0.5 whitespace-nowrap">
          <Clock className="w-2.5 h-2.5" /> Vacant Days (T12)
        </label>
        <input
          type="number"
          value={unit.vacantDays}
          onChange={(e) => onChange({ ...unit, vacantDays: Math.max(0, Number(e.target.value) || 0) })}
          min={0}
          max={365}
          className="w-16 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-[11px] text-slate-300
                     font-mono tabular-nums focus:outline-none focus:border-teal-500/30 transition-all"
        />
        {unit.vacantDays > 0 && (
          <span className="text-[9px] font-bold tabular-nums" style={{ color: unit.vacantDays > 30 ? '#EF4444' : '#F59E0B' }}>
            {((unit.vacantDays / 365) * 100).toFixed(1)}% vacancy
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function OccupancyCollectionTerminal({
  defaults = {},
  onValuesChange,
  className = '',
}: OccupancyCollectionTerminalProps) {
  const [units, setUnits] = useState<UnitOccupancy[]>(defaults.units ?? SEED_UNITS);
  const [totalDays, setTotalDays] = useState(defaults.totalDays ?? 365);

  /* ── Computations ── */
  const computed = useMemo(() => {
    const totalVacantDays = units.reduce((sum, u) => sum + u.vacantDays, 0);
    const occupancyRate = computeOccupancyRateByDays(totalVacantDays, totalDays * units.length);
    const totalOccupiedDays = (totalDays * units.length) - totalVacantDays;
    const occupiedUnitCount = units.filter(u => u.status === 'occupied').length;

    return {
      totalVacantDays,
      occupancyRate,
      totalOccupiedDays,
      occupiedUnitCount,
      totalUnitCount: units.length,
    };
  }, [units, totalDays]);

  /* ── Per-unit occupancy rate (simpler view: seed formula) ── */
  const seedRate = useMemo(() => {
    const avgVacant = units.length > 0
      ? units.reduce((s, u) => s + u.vacantDays, 0) / units.length
      : 0;
    return computeOccupancyRateByDays(Math.round(avgVacant), totalDays);
  }, [units, totalDays]);

  const stableOnChange = useCallback((values: OccupancyValues) => {
    onValuesChange?.(values);
  }, [onValuesChange]);

  useEffect(() => {
    stableOnChange({
      units,
      totalDays,
      occupancyRate: seedRate,
      totalVacantDays: computed.totalVacantDays,
      totalOccupiedDays: computed.totalOccupiedDays,
      occupiedUnitCount: computed.occupiedUnitCount,
      totalUnitCount: computed.totalUnitCount,
    });
  }, [units, totalDays, seedRate, computed, stableOnChange]);

  /* ── Unit management ── */
  const handleUnitChange = useCallback((idx: number, updated: UnitOccupancy) => {
    setUnits(prev => prev.map((u, i) => i === idx ? updated : u));
  }, []);

  const handleRemoveUnit = useCallback((idx: number) => {
    setUnits(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddUnit = useCallback(() => {
    const nextNum = units.length + 1;
    setUnits(prev => [...prev, {
      id: String(Date.now()),
      unitLabel: `Unit ${nextNum}`,
      tenantName: '',
      leaseStart: '',
      leaseEnd: '',
      vacantDays: 0,
      status: 'vacant' as const,
    }]);
  }, [units.length]);

  /* ── Colors ── */
  const rateColor = seedRate >= 95 ? '#14B8A6' : seedRate >= 85 ? '#F59E0B' : '#EF4444';
  const rateLabel = seedRate >= 95 ? 'Strong' : seedRate >= 85 ? 'Moderate' : 'At Risk';

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-4 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Tenants & Leases</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Occupancy Collection</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Period</label>
          <select
            value={totalDays}
            onChange={(e) => setTotalDays(Number(e.target.value))}
            className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1 text-xs text-slate-300
                       focus:outline-none focus:border-teal-500/30 transition-all cursor-pointer"
          >
            <option value={365}>Trailing 12M</option>
            <option value={90}>Quarter</option>
            <option value={30}>Month</option>
          </select>
        </div>
      </div>

      {/* ── Occupancy Result ── */}
      <div
        className="rounded-xl border p-4 flex items-center justify-between transition-all duration-500"
        style={{ borderColor: `${rateColor}30`, background: `${rateColor}08` }}
      >
        <div className="flex items-center gap-3">
          <Home className="w-6 h-6 flex-shrink-0" style={{ color: rateColor }} />
          <div>
            <p className="text-xs font-bold" style={{ color: rateColor }}>{rateLabel} Occupancy</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {computed.totalVacantDays} vacant day{computed.totalVacantDays !== 1 ? 's' : ''} across {units.length} unit{units.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold tabular-nums tracking-tighter" style={{ color: rateColor }}>
            {seedRate.toFixed(1)}
          </span>
          <span className="text-lg font-bold ml-0.5" style={{ color: rateColor }}>%</span>
          <p className="text-[9px] text-slate-600 mt-0.5">avg occupancy rate</p>
        </div>
      </div>

      {/* ── Unit-level summary bar ── */}
      <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-white/[0.04]">
        {units.map((u) => {
          const widthPct = units.length > 0 ? 100 / units.length : 0;
          const cfg = STATUS_CFG[u.status];
          return (
            <div
              key={u.id}
              className="h-full transition-all duration-300"
              style={{ width: `${widthPct}%`, backgroundColor: cfg.color, opacity: 0.7 }}
              title={`${u.unitLabel}: ${cfg.label}`}
            />
          );
        })}
      </div>

      {/* ── Unit grid legend ── */}
      <div className="flex items-center gap-3 text-[9px]">
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const count = units.filter(u => u.status === key).length;
          return (
            <span key={key} className="flex items-center gap-1 font-bold" style={{ color: cfg.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              {cfg.label}: {count}
            </span>
          );
        })}
      </div>

      {/* ── Unit Cards ── */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {units.map((unit, idx) => (
          <UnitRow
            key={unit.id}
            unit={unit}
            onChange={(u) => handleUnitChange(idx, u)}
            onRemove={() => handleRemoveUnit(idx)}
          />
        ))}
      </div>

      {/* ── Add Unit Button ── */}
      <button
        onClick={handleAddUnit}
        className="w-full py-2.5 rounded-lg border border-dashed border-white/10 text-xs font-bold text-slate-500
                   hover:border-teal-500/30 hover:text-teal-400 transition-all flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" />
        Add Unit
      </button>

      {/* ── Formula ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Formula</p>
        <p className="text-[11px] text-slate-400 font-mono">
          Occupancy = ({totalDays - Math.round(computed.totalVacantDays / units.length)} ÷ {totalDays}) × 100 = {seedRate.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
