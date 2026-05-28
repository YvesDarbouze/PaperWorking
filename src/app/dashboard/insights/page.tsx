'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   Compliance Vault | Insights
   Replaces the previous AI intelligence hub with the Data Room Vault
   Stitch design: "Data Room Vault (Desktop Active)"
   ═══════════════════════════════════════════════════════════════ */

export default function InsightsPage() {
  return (
    <div className="flex-1 flex overflow-hidden h-full">
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
        }
        .luminous-shadow {
            box-shadow: 0 0 20px -5px rgba(87, 241, 219, 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #3c4a46;
            border-radius: 10px;
        }
        .glow-text {
            text-shadow: 0 0 8px rgba(87, 241, 219, 0.5);
        }
      `}} />

      {/* Explorer View (Center) */}
      <section className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="font-headline-md text-2xl font-semibold mb-1 text-on-surface">Active Assets</h3>
            <p className="text-on-surface-variant font-body-sm">Immutable storage for institutional compliance.</p>
          </div>
          <button className="bg-primary text-on-primary font-label-md px-6 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-all luminous-shadow active:scale-95">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>upload</span>
            Upload Asset
          </button>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Folder Card 1 */}
          <div className="glass-card p-6 rounded-2xl group cursor-pointer hover:border-primary/50 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-all">
                  <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-lg text-on-surface group-hover:text-primary transition-colors">Skyline Residences</h4>
                  <p className="text-label-sm text-on-surface-variant">Asset ID: #SR-40922</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-surface-container p-3 rounded-lg border border-outline-variant">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">Documents</p>
                <p className="text-on-surface font-bold">142 Files</p>
              </div>
              <div className="flex-1 bg-surface-container p-3 rounded-lg border border-outline-variant">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">Integrity</p>
                <p className="text-primary font-bold">100%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <img alt="User" className="w-6 h-6 rounded-full border border-background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhBpgIFF9PJg5nzg1C3dK4_qssj8y7QA0L_I7U-O5xW-xd9pbCOPOJ-NQoeu0LH0oHh2GtMOxBtA7V4jLYpVfZx6XAa5HkbySdaZI-x4ysn1z63MXeiK7kBZmDjzj5_qE_JpXU7JThWWxqAPGufxo8y09ysDjh4yKy-SnKfP-DWSeS8wHuI_Log3RB8CprwDiVjpDW6gnDHwN8jLEzZAIXeOEykNSt8iO1F44wqG7FOM0AeZh9FPpaYpbP73jTqLKWL3F8D0iqfyi9" />
                <img alt="User" className="w-6 h-6 rounded-full border border-background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4ruAE_vafOkrPmGUZ1xqt0H1osmhZuzdzY9Zi8JWn2uVEGytf8L6Gz0E4kNDIKRtxAUV4Y_WeEk7Qbtga2AlW78v1f7E6b2SmL_je3a0trDJnad_VENUSUyPee3k7kGj4GwiMmESVrzHLVrX0ThMt_kJ-soGolXaCgvsxHrJarvt-iPEvcqVVEiFCdQEbjeIv6wb6CmIYF2N_DrDZ9O3RKm1g-bYu7ygojgOdzmwHbTWQPtrncaTJz380W15zyvRF4lF-iCubeaUz" />
              </div>
              <span className="text-xs text-on-surface-variant ml-2">Shared with Audit Committee</span>
            </div>
          </div>

          {/* Folder Card 2 */}
          <div className="glass-card p-6 rounded-2xl group cursor-pointer hover:border-primary/50 transition-all">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-tertiary/10 flex items-center justify-center border border-tertiary/20 group-hover:bg-tertiary/20 transition-all">
                  <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                </div>
                <div>
                  <h4 className="font-headline-sm text-lg text-on-surface group-hover:text-tertiary transition-colors">Harbor Logistics</h4>
                  <p className="text-label-sm text-on-surface-variant">Asset ID: #HL-88210</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant">more_vert</span>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-surface-container p-3 rounded-lg border border-outline-variant">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">Documents</p>
                <p className="text-on-surface font-bold">87 Files</p>
              </div>
              <div className="flex-1 bg-surface-container p-3 rounded-lg border border-outline-variant">
                <p className="text-[10px] text-on-surface-variant uppercase mb-1">Integrity</p>
                <p className="text-tertiary font-bold">99.8%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">history</span>
              <span className="text-xs text-on-surface-variant ml-1">Last synced: 14 mins ago</span>
            </div>
          </div>
        </div>

        {/* Asset Table */}
        <div className="mt-12">
          <h3 className="font-headline-sm text-lg mb-6 text-on-surface">Recent Documents</h3>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-high/50 border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-xs tracking-wider">Name</th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-xs tracking-wider">Classification</th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-xs tracking-wider">Status</th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-xs tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                <tr className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">description</span>
                    <span className="font-body-md text-on-surface group-hover:text-primary transition-colors">Q3_Tax_Audit_Report.pdf</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs font-label-sm border border-outline-variant text-on-surface">Confidential</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-on-surface">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-sm">Verified</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 24, 2023 11:22</td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">gavel</span>
                    <span className="font-body-md text-on-surface group-hover:text-primary transition-colors">Land_Deed_Registry_2023.hash</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-surface-container-highest px-3 py-1 rounded-full text-xs font-label-sm border border-outline-variant text-on-surface">Restricted</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-on-surface">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span className="text-sm">Verified</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">Oct 23, 2023 09:45</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Details Pane (Right) */}
      <aside className="w-96 glass-card border-l border-outline-variant overflow-y-auto custom-scrollbar flex flex-col shrink-0 hidden xl:flex">
        <div className="p-6 border-b border-outline-variant">
          <h3 className="font-headline-sm text-lg mb-4 text-on-surface">Vault Audit Log</h3>
          
          {/* Metrics Shell */}
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-surface-container-highest rounded-xl border border-outline-variant relative overflow-hidden">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">Folder Health</p>
                  <h4 className="text-2xl font-bold text-primary glow-text">99.8%</h4>
                </div>
                <span className="material-symbols-outlined text-primary/40 text-4xl">ecg_heart</span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[99.8%] luminous-shadow"></div>
              </div>
            </div>
            
            <div className="p-4 bg-surface-container-highest rounded-xl border border-outline-variant">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">enhanced_encryption</span>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase">Encryption Standard</p>
                  <p className="font-bold text-on-surface">AES-256 Poly1305</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Event Log */}
        <div className="flex-1 p-6">
          <h4 className="text-xs font-label-md text-on-surface-variant uppercase mb-4">Live Access Logs</h4>
          <div className="space-y-6 relative before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant">
            
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-4 h-4 bg-primary rounded-full border-4 border-surface shadow-[0_0_8px_rgba(87,241,219,0.5)]"></div>
              <p className="text-sm font-bold text-on-surface">Access Granted: Node_042</p>
              <p className="text-xs text-on-surface-variant mb-1">Authenticated via Hardware Token</p>
              <p className="text-[10px] text-primary/60 font-mono">2023-10-24 14:12:01.445</p>
            </div>
            
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-4 h-4 bg-outline-variant rounded-full border-4 border-surface"></div>
              <p className="text-sm font-bold text-on-surface">Manifest Hash Re-verified</p>
              <p className="text-xs text-on-surface-variant mb-1">SHA-512 Checksum Matching 100%</p>
              <p className="text-[10px] text-on-surface-variant font-mono">2023-10-24 13:58:22.091</p>
            </div>
            
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-4 h-4 bg-error rounded-full border-4 border-surface shadow-[0_0_8px_rgba(255,180,171,0.5)]"></div>
              <p className="text-sm font-bold text-on-error-container">Unauthorized Attempt</p>
              <p className="text-xs text-on-surface-variant mb-1">IP: 192.168.1.1 (Internal/Audit-VLAN)</p>
              <p className="text-[10px] text-error font-mono">2023-10-24 13:45:10.772</p>
            </div>
            
            <div className="relative pl-8">
              <div className="absolute left-0 top-1 w-4 h-4 bg-outline-variant rounded-full border-4 border-surface"></div>
              <p className="text-sm font-bold text-on-surface">Auto-Sync Completed</p>
              <p className="text-xs text-on-surface-variant mb-1">Harbor Logistics Local Node</p>
              <p className="text-[10px] text-on-surface-variant font-mono">2023-10-24 13:30:00.000</p>
            </div>
            
          </div>
        </div>
        
        <div className="p-6 border-t border-outline-variant">
          <button className="w-full py-3 rounded-xl border border-outline-variant hover:bg-white/5 transition-colors font-label-md flex items-center justify-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-sm">history_edu</span>
            Export Full Audit Path
          </button>
        </div>
      </aside>
    </div>
  );
}
