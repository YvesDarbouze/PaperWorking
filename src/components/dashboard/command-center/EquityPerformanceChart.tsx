"use client";

import React, { useState } from "react";

export function EquityPerformanceChart() {
  const [viewMode, setViewMode] = useState<"Property" | "My Share">("Property");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const datasets = {
    "Property": [
      { label: "Jan", value: 120000, valueFormatted: "$120k" },
      { label: "Feb", value: 150000, valueFormatted: "$150k" },
      { label: "Mar", value: 135000, valueFormatted: "$135k" },
      { label: "Apr", value: 185000, valueFormatted: "$185k" },
      { label: "May", value: 165000, valueFormatted: "$165k" },
      { label: "Jun", value: 210000, valueFormatted: "$210k" },
    ],
    "My Share": [
      { label: "Jan", value: 36000, valueFormatted: "$36k" },
      { label: "Feb", value: 45000, valueFormatted: "$45k" },
      { label: "Mar", value: 40500, valueFormatted: "$40.5k" },
      { label: "Apr", value: 55500, valueFormatted: "$55.5k" },
      { label: "May", value: 49500, valueFormatted: "$49.5k" },
      { label: "Jun", value: 63000, valueFormatted: "$63k" },
    ]
  };

  const currentData = datasets[viewMode];
  
  // SVG configuration
  const width = 500;
  const height = 200;
  const paddingX = 40;
  const paddingY = 20;

  // Calculate scales
  const maxVal = Math.max(...currentData.map(d => d.value)) * 1.15;
  
  const points = currentData.map((d, i) => {
    const x = paddingX + (i * (width - 2 * paddingX)) / (currentData.length - 1);
    const y = height - paddingY - (d.value / maxVal) * (height - 2 * paddingY);
    return { x, y, label: d.label, valStr: d.valueFormatted };
  });

  // Calculate smooth bezier curve
  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const curvePath = getBezierPath(points);
  const areaPath = curvePath 
    ? `${curvePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`
    : "";

  return (
    <div className="glass-card p-margin-mobile rounded-2xl h-full flex flex-col relative overflow-visible">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Equity Growth</h3>
          <p className="text-on-surface-variant font-body-sm text-body-sm">Q1 2024 Performance metrics</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode("Property")}
            className={`px-4 py-1.5 rounded-lg font-label-md text-label-md transition-colors cursor-pointer ${
              viewMode === "Property" ? "bg-primary/20 text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Property
          </button>
          <button
            onClick={() => setViewMode("My Share")}
            className={`px-4 py-1.5 rounded-lg font-label-md text-label-md transition-colors cursor-pointer ${
              viewMode === "My Share" ? "bg-primary/20 text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            My Share
          </button>
        </div>
      </div>
      
      {/* SVG Chart Container */}
      <div className="flex-1 min-h-[12rem] w-full relative flex items-end mt-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio, idx) => {
            const y = paddingY + (height - 2 * paddingY) * ratio;
            return (
              <line
                key={idx}
                x1={paddingX}
                x2={width - paddingX}
                y1={y}
                y2={y}
                stroke="var(--color-outline-variant)"
                strokeDasharray="4 4"
                className="opacity-15"
              />
            );
          })}

          {/* X Axis line */}
          <line
            x1={paddingX}
            x2={width - paddingX}
            y1={height - paddingY}
            y2={height - paddingY}
            stroke="var(--color-outline-variant)"
            className="opacity-20"
          />

          {/* Chart paths */}
          {areaPath && (
            <path d={areaPath} fill="url(#chartGradient)" className="transition-all duration-300" />
          )}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              className="transition-all duration-300 luminous-glow"
            />
          )}

          {/* Interactive vertical hover guide */}
          {hoveredIndex !== null && (
            <line
              x1={points[hoveredIndex].x}
              x2={points[hoveredIndex].x}
              y1={paddingY}
              y2={height - paddingY}
              stroke="var(--color-primary)"
              strokeDasharray="2 2"
              className="opacity-40"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i} className="transition-all duration-300">
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={10}
                    fill="var(--color-primary)"
                    className="opacity-20 animate-ping"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : 4}
                  fill={isHovered ? "var(--color-primary)" : "var(--color-surface-container-lowest)"}
                  stroke="var(--color-primary)"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* Labels */}
          {points.map((pt, i) => (
            <text
              key={i}
              x={pt.x}
              y={height - paddingY + 16}
              textAnchor="middle"
              className="fill-on-surface-variant font-mono text-[10px] opacity-70"
            >
              {pt.label}
            </text>
          ))}

          {/* Invisible interactive hover rects */}
          {points.map((pt, i) => (
            <rect
              key={i}
              x={pt.x - 20}
              y={0}
              width={40}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>

        {/* Dynamic Interactive Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute bg-surface-container-lowest/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 shadow-xl pointer-events-none transition-all duration-150 z-10"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="font-semibold text-on-surface text-sm">
              {points[hoveredIndex].valStr}
            </div>
            <div className="text-on-surface-variant font-mono text-[10px] opacity-75">
              {points[hoveredIndex].label} · {viewMode}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
