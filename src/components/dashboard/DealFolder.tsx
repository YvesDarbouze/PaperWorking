'use client';

import React from 'react';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════════
   DealFolder — Standardized Visual Deal Identifier
   
   Every Deal across the application is represented by this component:
   a minimalist line-drawn file-folder SVG that dynamically displays
   the property's house number + street as its permanent identifier.
   
   Usage:
     <DealFolder deal={deal} size="md" />             // default
     <DealFolder deal={deal} size="sm" showPrice />    // compact w/ price
     <DealFolder deal={deal} size="lg" />              // expanded view
   ═══════════════════════════════════════════════════════════════════ */

type FolderSize = 'sm' | 'md' | 'lg';

interface DealFolderProps {
  deal: Project;
  size?: FolderSize;
  showPrice?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

/* ─── Phase accent map ─── */
const STATUS_COLOR: Record<string, string> = {
  Lead:             '#F2F2F2',
  Sourcing:         '#F2F2F2',
  'Under Contract': '#CCCCCC',
  Renovating:       '#A5A5A5',
  Rehab:            '#A5A5A5',
  Listed:           '#7F7F7F',
  Sold:             '#595959',
  Rented:           '#595959',
  Closed:           '#595959',
};

/* ─── Size scale tokens ─── */
const SIZE_MAP: Record<FolderSize, {
  svgW: number; svgH: number;
  labelSize: string; subSize: string;
  gap: string; pad: string;
}> = {
  sm: { svgW: 28, svgH: 22, labelSize: 'text-sm', subSize: 'text-xs',  gap: 'gap-2',   pad: 'p-2'   },
  md: { svgW: 36, svgH: 28, labelSize: 'text-sm',      subSize: 'text-sm', gap: 'gap-3',   pad: 'p-3'   },
  lg: { svgW: 48, svgH: 38, labelSize: 'text-base',    subSize: 'text-xs',     gap: 'gap-3.5', pad: 'p-4'   },
};

/**
 * Extracts the house number + street name from a full address.
 * "1422 Maple St, Miami, FL 33142" → "1422 Maple St"
 */
function extractStreetLabel(address: string): string {
  if (!address) return 'Untitled';
  const comma = address.indexOf(',');
  return comma > 0 ? address.slice(0, comma).trim() : address.trim();
}

/**
 * Mini line-art file folder SVG.
 * The tab sits at the top-left third; the folder body forms the rectangle.
 * Stroke inherits the phase accent color for visual cohesion.
 */
function FolderSVG({
  width,
  height,
  accent,
}: {
  width: number;
  height: number;
  accent: string;
}) {
  const tabW = width * 0.38;
  const tabH = height * 0.22;
  const r    = 2; // corner radius

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      {/* Folder body */}
      <rect
        x={0.75}
        y={tabH}
        width={width - 1.5}
        height={height - tabH - 0.75}
        rx={r}
        ry={r}
        stroke={accent}
        strokeWidth={1.5}
        fill={`${accent}10`}
      />
      {/* Tab */}
      <path
        d={`M${r} ${tabH} V${r} Q${r} 0 ${r * 2} 0 H${tabW - r} Q${tabW} 0 ${tabW} ${tabH}`}
        stroke={accent}
        strokeWidth={1.5}
        fill={`${accent}18`}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DealFolder({
  deal,
  size = 'md',
  showPrice = false,
  showStatus = false,
  onClick,
  className = '',
}: DealFolderProps) {
  const t = SIZE_MAP[size];
  const accent = STATUS_COLOR[deal.status] || '#cccccc';
  const streetLabel = extractStreetLabel(deal.address);
  const purchase = deal.financials?.purchasePrice || 0;

  const Wrapper = onClick ? 'button' : 'div';
  const interactiveStyle = onClick
    ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all'
    : '';

  return (
    <Wrapper
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={`
        flex items-center ${t.gap} ${t.pad}
        bg-white border border-gray-200 rounded-lg
        ${interactiveStyle}
        ${className}
      `}
    >
      {/* ── Folder icon ── */}
      <FolderSVG width={t.svgW} height={t.svgH} accent={accent} />

      {/* ── Label block ── */}
      <div className="flex-1 min-w-0 text-left">
        <h4 className={`${t.labelSize} font-semibold text-gray-900 truncate leading-tight`}>
          {streetLabel}
        </h4>

        {/* Secondary line: full address or status */}
        {(deal.address.includes(',') || showStatus) && (
          <p className={`${t.subSize} text-gray-500 truncate mt-0.5`}>
            {showStatus
              ? deal.status
              : deal.address}
          </p>
        )}

        {/* Optional price badge */}
        {showPrice && purchase > 0 && (
          <span className={`${t.subSize} font-mono text-gray-500 mt-1 inline-block`}>
            ${purchase.toLocaleString()}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

/* ─── Convenience: Icon-only export for tight spaces ─── */
export function DealFolderIcon({
  status,
  size = 20,
}: {
  status: string;
  size?: number;
}) {
  const accent = STATUS_COLOR[status] || '#cccccc';
  return <FolderSVG width={size} height={size * 0.78} accent={accent} />;
}
