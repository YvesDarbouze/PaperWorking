"use client";

import React from "react";

/**
 * ActivePipeline — 4-Lane REIL Phase Pipeline
 *
 * Displays projects across 4 horizontal lanes corresponding to
 * REIL phases: Acquisition, Transaction, Rehab, Hold/Exit.
 * Uses demo data for initial empty state.
 */

interface PipelineProject {
  id: string;
  name: string;
  address: string;
  keyMetric: string;
  keyMetricLabel: string;
  daysInPhase: number;
}

interface PipelineLane {
  phase: string;
  phaseNumber: number;
  color: string;
  icon: string;
  projects: PipelineProject[];
}

const DEMO_LANES: PipelineLane[] = [
  {
    phase: "Acquisition",
    phaseNumber: 1,
    color: "#3B82F6",
    icon: "search",
    projects: [
      {
        id: "acq-1",
        name: "Skyline Lofts",
        address: "1420 Peachtree St NE, Atlanta, GA",
        keyMetric: "$285K",
        keyMetricLabel: "Target Price",
        daysInPhase: 12,
      },
      {
        id: "acq-2",
        name: "Cedar Park Duplex",
        address: "804 S Bell Blvd, Cedar Park, TX",
        keyMetric: "6.2%",
        keyMetricLabel: "Cap Rate",
        daysInPhase: 5,
      },
    ],
  },
  {
    phase: "Transaction",
    phaseNumber: 2,
    color: "#8B5CF6",
    icon: "receipt_long",
    projects: [
      {
        id: "txn-1",
        name: "Vertex Logistics Center",
        address: "2200 W Buckeye Rd, Phoenix, AZ",
        keyMetric: "$1.2M",
        keyMetricLabel: "Under Contract",
        daysInPhase: 22,
      },
    ],
  },
  {
    phase: "Rehab",
    phaseNumber: 3,
    color: "#F59E0B",
    icon: "construction",
    projects: [
      {
        id: "rehab-1",
        name: "The Foundry Bloc",
        address: "1850 Blake St, Denver, CO",
        keyMetric: "42%",
        keyMetricLabel: "Completion",
        daysInPhase: 45,
      },
      {
        id: "rehab-2",
        name: "Magnolia Commons",
        address: "312 Magnolia Ave, Orlando, FL",
        keyMetric: "78%",
        keyMetricLabel: "Completion",
        daysInPhase: 91,
      },
    ],
  },
  {
    phase: "Hold / Exit",
    phaseNumber: 4,
    color: "#10B981",
    icon: "exit_to_app",
    projects: [
      {
        id: "hold-1",
        name: "Oasis Corporate",
        address: "800 Brickell Ave, Miami, FL",
        keyMetric: "$4,200/mo",
        keyMetricLabel: "Cash Flow",
        daysInPhase: 180,
      },
    ],
  },
];

export function ActivePipeline() {
  return (
    <section className="space-y-stack-md">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <h2
          className="text-xl font-semibold tracking-tight"
          style={{ color: "rgba(218,228,236,0.9)" }}
        >
          Active Pipeline
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {DEMO_LANES.map((lane) => (
            <span
              key={lane.phase}
              className="text-[11px] font-medium flex items-center gap-1.5 px-2"
              style={{ color: "rgba(218,228,236,0.5)" }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: lane.color }}
              />
              {lane.phase}
            </span>
          ))}
        </div>
      </div>

      {/* 4-Lane Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {DEMO_LANES.map((lane) => (
          <div key={lane.phase} className="flex flex-col gap-3">
            {/* Lane Header */}
            <div
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-base"
                  style={{ color: lane.color }}
                >
                  {lane.icon}
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(218,228,236,0.7)" }}
                >
                  {lane.phase}
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${lane.color}20`,
                  color: lane.color,
                }}
              >
                {lane.projects.length}
              </span>
            </div>

            {/* Project Cards */}
            {lane.projects.length > 0 ? (
              lane.projects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-xl p-4 cursor-pointer transition-all duration-200 group"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderTop: `2px solid ${lane.color}40`,
                  }}
                >
                  <h4
                    className="text-sm font-semibold truncate mb-1"
                    style={{ color: "rgba(218,228,236,0.9)" }}
                  >
                    {project.name}
                  </h4>
                  <p
                    className="text-[11px] truncate mb-3"
                    style={{ color: "rgba(218,228,236,0.4)" }}
                  >
                    {project.address}
                  </p>

                  <div className="flex justify-between items-end">
                    <div>
                      <div
                        className="text-base font-bold"
                        style={{ color: lane.color }}
                      >
                        {project.keyMetric}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "rgba(218,228,236,0.4)" }}
                      >
                        {project.keyMetricLabel}
                      </div>
                    </div>
                    <div
                      className="text-[10px] font-mono px-2 py-1 rounded-md"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.04)",
                        color: "rgba(218,228,236,0.5)",
                      }}
                    >
                      {project.daysInPhase}d
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                  />
                </div>
              ))
            ) : (
              /* Empty lane placeholder */
              <div
                className="rounded-xl p-6 flex items-center justify-center"
                style={{
                  border: "2px dashed rgba(255,255,255,0.08)",
                  minHeight: "120px",
                }}
              >
                <span
                  className="text-xs text-center"
                  style={{ color: "rgba(218,228,236,0.3)" }}
                >
                  No deals in this phase
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
