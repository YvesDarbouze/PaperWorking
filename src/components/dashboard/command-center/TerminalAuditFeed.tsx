"use client";

import React, { useEffect, useRef } from "react";

export function TerminalAuditFeed() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Micro-interaction for the terminal scroll
  useEffect(() => {
    const terminal = scrollRef.current;
    if (!terminal) return;

    const intervalId = setInterval(() => {
      if (terminal.scrollTop + terminal.clientHeight >= terminal.scrollHeight) {
        terminal.scrollTop = 0;
      } else {
        terminal.scrollBy({ top: 1, behavior: "smooth" });
      }
    }, 150);

    return () => clearInterval(intervalId);
  }, []);

  const logs = [
    { status: "[SUCCESS]", time: "12:04:22", msg: "Portfolio reconciliation complete. No delta found.", type: "success" },
    { status: "[INFO]", time: "12:02:15", msg: "Syncing Skyline Lofts ledger with bank API v4.2", type: "info" },
    { status: "[TRACE]", time: "12:01:03", msg: "Thread #819 blocked by metadata lock. Retrying...", type: "trace" },
    { status: "[SUCCESS]", time: "11:58:45", msg: "New node deployed for Tenant Registry expansion.", type: "success" },
    { status: "[INFO]", time: "11:55:20", msg: "Yves Darbouze logged in from IP 192.168.1.1", type: "info" },
    { status: "[SUCCESS]", time: "11:50:00", msg: "Scheduled tax report generated for Q4 2023.", type: "success" },
  ];

  return (
    <div className="glass-card rounded-2xl overflow-hidden border-primary/20 shadow-lg luminous-glow">
      <div className="bg-surface-container-lowest/80 border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 animate-pulse">
            <div className="w-3 h-3 rounded-full opacity-85" style={{ backgroundColor: "#ff5f56" }}></div>
            <div className="w-3 h-3 rounded-full opacity-85" style={{ backgroundColor: "#ffbd2e" }}></div>
            <div className="w-3 h-3 rounded-full opacity-85" style={{ backgroundColor: "#27c93f" }}></div>
          </div>
          <span className="font-mono text-xs text-outline tracking-widest ml-4 uppercase">System Audit Feed</span>
        </div>
        <div className="font-mono text-xs text-primary/40">Uptime: 99.98%</div>
      </div>
      <div 
        ref={scrollRef}
        className="h-48 terminal-scroll overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {logs.map((log, index) => (
          <div key={index} className={`flex gap-4 py-1 ${index === 0 ? 'animate-pulse' : ''}`}>
            <span className={
              log.type === 'success' ? 'text-primary' :
              log.type === 'info' ? 'text-primary/60' :
              'text-primary/50'
            }>
              {log.status}
            </span>
            <span className="text-outline">{log.time}</span>
            <span className={
              log.type === 'trace' ? 'text-outline-variant' :
              log.type === 'info' ? 'text-on-surface-variant' :
              'text-on-surface'
            }>
              {log.msg}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
