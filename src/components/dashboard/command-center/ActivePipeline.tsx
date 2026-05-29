"use client";

import React from "react";

export function ActivePipeline() {
  const cards = [
    {
      title: "Project Neon Sky",
      type: "Multi-family • Austin, TX",
      stage: "Underwriting",
      progress: "45%",
      subtext: "Phase 1 of 3",
      icon: "domain_add",
      accentClass: "text-primary",
      bgAccentClass: "bg-primary",
      borderClass: "border-t-primary/50",
      iconBgClass: "bg-primary/10",
    },
    {
      title: "Vertex Logistics Center",
      type: "Industrial • Phoenix, AZ",
      stage: "Closing",
      progress: "85%",
      subtext: "Finalizing Docs",
      icon: "receipt_long",
      accentClass: "text-secondary",
      bgAccentClass: "bg-secondary",
      borderClass: "border-t-secondary/50",
      iconBgClass: "bg-secondary/10",
    },
    {
      title: "The Foundry Bloc",
      type: "Mixed-Use • Denver, CO",
      stage: "Renovation",
      progress: "30%",
      subtext: "CapEx deployment",
      icon: "construction",
      accentClass: "text-tertiary-container",
      bgAccentClass: "bg-tertiary-container",
      borderClass: "border-t-tertiary-container/50",
      iconBgClass: "bg-tertiary-container/10",
    },
    {
      title: "Oasis Corporate",
      type: "Office • Miami, FL",
      stage: "Marketing",
      progress: "60%",
      subtext: "Buyer Due Diligence",
      icon: "exit_to_app",
      accentClass: "text-primary-fixed",
      bgAccentClass: "bg-primary-fixed",
      borderClass: "border-t-primary-fixed/50",
      iconBgClass: "bg-primary-fixed/10",
    },
  ];

  return (
    <section className="space-y-stack-md">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2">
        <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Active Pipeline</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {/* Phase Legend */}
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-primary" /> Acquisition
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-secondary" /> Purchase
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-tertiary-container" /> Hold
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5 px-2">
            <span className="w-2 h-2 rounded-full bg-primary-fixed" /> Exit
          </span>
        </div>
      </div>

      {/* Bento Grid for Pipeline Folders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`glass-card rounded-xl p-5 hover:bg-surface-container-high/40 transition-colors cursor-pointer group border-t-2 ${card.borderClass}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-2 rounded-lg ${card.iconBgClass} ${card.accentClass}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <span className="font-label-sm text-label-sm px-2 py-1 bg-surface-container-high rounded-md text-on-surface-variant">
                {card.stage}
              </span>
            </div>
            <div>
              <h3 className="font-label-md text-label-md text-on-surface mb-1 truncate">{card.title}</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 truncate">{card.type}</p>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${card.bgAccentClass}`}
                  style={{ width: card.progress }}
                />
              </div>
              <div className="flex justify-between mt-2 font-label-sm text-label-sm text-on-surface-variant">
                <span>{card.subtext}</span>
                <span className={card.accentClass}>{card.progress}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
