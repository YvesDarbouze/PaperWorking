"use client";

import React from "react";

export function PortfolioClustersGrid() {
  const clusters = [
    {
      title: "Skyline Lofts",
      phase: "Development Progress",
      progress: "82%",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDefZ0kPA2kYaK0znyPqYr4ENZ2OMNs3XH2puNL9OPDa-GcIf2HqIW4akLoSvsUXTbKy1O75PS4V3bw1M4uKR6vd8_QcEtguXVGASg5Hk9zG19xtXOBIjdy5lE0zeifs_4ZktxDXQ7sHh93HihlLPpVuiU_2zbCKo-feyn8DHG4aDY6l5fCxc7WE2yMpclvgi6L4GCDHo9nZDfSvoOsdKO7NaGq8BxI886LahtKVGyf24B7JRLtVfRwNrn-GWAqQ2j2xhOPfPzyCEO",
      avatars: [
        "bg-primary/40 border-background",
        "bg-secondary/40 border-background"
      ]
    },
    {
      title: "Oakwood Hub",
      phase: "Construction Phase",
      progress: "45%",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSbvuuBaVam-PSsRDsEScfq2PX4A0vlW1BQcepjfAbMCIkneVUSBCcrkFBolBY7Ngo8gBBmKepkVDOI5flyhDtFXBem5m7mjZUzMbnDpz6d5Gda2pr3_onjL0l2uUkU-xVFlzslzFPgvpHfBW_g_ll6uCoqRJRo1McDFk5qilFJKOBf4u2OgEsg3NxjRY2EjNncgagX22N6bDy3R_I0-sqRQ_wu0f9ubQtFFgQuAynq1qIb0Tbt4HK0PugEkmpIV8dleAq2Iu8TWOH",
      avatars: [
        "bg-primary/40 border-background"
      ]
    },
    {
      title: "The Vault",
      phase: "Secured Progress",
      progress: "100%",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxOyvBBvd7EZcXtilaX2-ZxCgcGjs9kVr3C0fS2sWp0pjFaZlGTkJD4iFuSTmSuf-cBC9rl7EU7T6GgEE72aAecPQ7shezI8W6sT7PO4RPW-iASSpQlM78a0IiuPXAD_QKl-cN2xBvL5mIElADSFkY4Rs8N_4_yE-PDy1UrYbjD_gVPmJpH7gjZS0nv-S9robF8G0JhRvwVq7TzT035grkM6OfwlusssMoNNDKUhekatS7Jr_qdw4J0TVu7qaugUdTJSQ8r6MlpaHR",
      avatars: [
        "bg-primary/40 border-background",
        "bg-secondary/40 border-background",
        "bg-surface-container-highest border-background"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-headline-md text-headline-md text-on-surface">Portfolio Clusters</h3>
        <button className="text-primary font-label-md text-label-md hover:underline">View All Assets</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter-desktop">
        {clusters.map((cluster, idx) => (
          <div key={idx} className="glass-card rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform cursor-pointer">
            <div className="h-32 bg-surface-container-high relative overflow-hidden">
              <img 
                src={cluster.image} 
                className="w-full h-full object-cover opacity-60" 
                alt={cluster.title} 
              />
              <div className="absolute top-4 left-4 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full border border-primary/30">
                <span className="text-xs font-bold text-primary uppercase tracking-tighter">
                  {cluster.title}
                </span>
              </div>
            </div>
            <div className="p-6 folder-cut bg-white/5">
              <div className="flex justify-between mb-4">
                <span className="text-on-surface-variant font-label-sm text-label-sm">{cluster.phase}</span>
                <span className="text-primary font-mono text-sm">{cluster.progress}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full">
                <div 
                  className="h-full bg-primary luminous-glow" 
                  style={{ width: cluster.progress }}
                ></div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="flex -space-x-2">
                  {cluster.avatars.map((avatar, i) => (
                    <div key={i} className={`w-6 h-6 rounded-full border ${avatar}`}></div>
                  ))}
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
