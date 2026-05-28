"use client";

import React, { useState } from "react";

export default function ProjectsPage() {
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Acquisition", "Purchase", "Hold", "Exit"];

  const projects = [
    {
      id: 1,
      name: "1242 Ocean View Blvd",
      location: "San Francisco, CA",
      strategy: "Flip",
      ownership: "85.00%",
      phase: "Acquisition",
      phaseDetails: "Due Diligence",
      progress: 60,
      color: "primary-container",
      hex: "#2dd4bf", // Used for shadow
    },
    {
      id: 2,
      name: "8800 Skyline Drive",
      location: "Austin, TX",
      strategy: "Rental",
      ownership: "100.00%",
      phase: "Purchase",
      phaseDetails: "Closing",
      progress: 90,
      color: "secondary",
      hex: "#adc6ff",
    },
    {
      id: 3,
      name: "455 Industrial Pkwy",
      location: "Denver, CO",
      strategy: "Commercial",
      ownership: "50.00%",
      phase: "Hold",
      phaseDetails: "Lease term",
      progress: 25,
      color: "tertiary",
      hex: "#ffd1aa",
    },
    {
      id: 4,
      name: "990 Riverside Apt",
      location: "Miami, FL",
      strategy: "Multi-Fam",
      ownership: "100.00%",
      phase: "Exit",
      phaseDetails: "Escrow",
      progress: 80,
      color: "error",
      hex: "#ffb4ab",
    },
  ];

  const filteredProjects =
    filter === "All" ? projects : projects.filter((p) => p.phase === filter);

  return (
    <div className="p-4 md:p-gutter-desktop max-w-container-max mx-auto space-y-stack-lg">
      {/* Page Header & Filtering */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">
            Active Projects
          </h2>
          <p className="font-body-sm text-on-surface-variant mt-1">
            Manage your real estate portfolio across all phases.
          </p>
        </div>
        {/* Glass Segmented Control */}
        <div className="glass-panel rounded-full p-1 flex w-full md:w-auto overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full font-label-sm whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-white/10 text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`glass-card relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 cursor-pointer`}
              style={{
                borderRadius: "0.5rem 2rem 0.5rem 0.5rem",
                borderTop: `2px solid var(--color-${project.color})`,
              }}
            >
              <div className="absolute top-0 right-0 p-3">
                <span
                  className={`material-symbols-outlined text-on-surface-variant/50 group-hover:text-${project.color} transition-colors`}
                >
                  more_vert
                </span>
              </div>
              <div className="p-5 flex flex-col h-full gap-4">
                <div className="space-y-1 pr-6">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider bg-${project.color}/10 text-${project.color} uppercase`}
                  >
                    {project.phase}
                  </span>
                  <h3 className="font-headline-md text-on-surface leading-tight">
                    {project.name}
                  </h3>
                  <p className="font-body-sm text-on-surface-variant">
                    {project.location}
                  </p>
                </div>
                <div className="flex justify-between items-end mt-auto pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                      Strategy
                    </p>
                    <p className="font-mono text-sm text-on-surface">
                      {project.strategy}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                      Ownership
                    </p>
                    <p className={`font-mono text-sm text-${project.color}`}>
                      {project.ownership}
                    </p>
                  </div>
                </div>
                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                    <span>{project.phaseDetails}</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-${project.color} rounded-full`}
                      style={{
                        width: `${project.progress}%`,
                        boxShadow: `0 0 10px ${project.hex}80`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="mt-16 flex flex-col items-center justify-center p-12 glass-panel rounded-3xl border border-white/5 text-center max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-surface-container-high border border-white/10 flex items-center justify-center mb-6 shadow-xl relative overflow-hidden" style={{ borderRadius: "0.5rem 2rem 0.5rem 0.5rem" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            <span
              className="material-symbols-outlined text-4xl text-on-surface-variant/50 z-10"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              folder_open
            </span>
          </div>
          <h3 className="font-headline-md text-on-surface mb-2">
            No active projects detected
          </h3>
          <p className="font-body-md text-on-surface-variant mb-8 max-w-md">
            Your project terminal is empty. Initialize a new real estate asset to
            begin tracking phases, ownership, and documents.
          </p>
          <button className="bg-primary text-on-primary font-label-md px-6 py-3 rounded-full luminous-button flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">add</span>
            Create First Project
          </button>
        </div>
      )}
    </div>
  );
}
