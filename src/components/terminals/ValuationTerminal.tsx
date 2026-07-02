'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
export default function ValuationTerminal() {
    const [arv, setArv] = useState<number>(450000);
    const [holdTime, setHoldTime] = useState<number>(6);
    const [sellerConcessions, setSellerConcessions] = useState<number>(5000);
    const [agentCommission, setAgentCommission] = useState<number>(5);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(true);
    }, []);

    const dispositionCost = arv * (agentCommission / 100);

    return (
        <div className="min-h-screen bg-[radial-gradient(rgba(69,73,85,0.05)_1px,transparent_1px)] bg-[length:32px_32px] bg-[#0d0a0b] text-[#9E9DA0] antialiased pb-safe">
            {/* Top Navigation Shell */}
            <header className="fixed top-0 w-full z-50 bg-[#0d0a0b]/80 backdrop-blur-xl border-b border-white/10 shadow-[0_0_20px_-5px_rgba(69,73,85,0.15)] flex items-center justify-between px-[20px] md:px-[40px] h-16">
                <div className="flex items-center gap-[8px]">
                    <span className="material-symbols-outlined text-[#454955]">terminal</span>
                    <h1 className="font-['Plus_Jakarta_Sans'] text-[24px] leading-[32px] font-bold text-[#454955] tracking-tighter uppercase">PaperWorking</h1>
                </div>
                <div className="hidden md:flex gap-[16px]">
                    <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em] text-[#9E9DA0] hover:text-[#454955] transition-colors cursor-pointer">Command Center</span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em] text-[#454955] border-b-2 border-[#454955]">Deal Analyzer</span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em] text-[#9E9DA0] hover:text-[#454955] transition-colors cursor-pointer">Data Room</span>
                </div>
                <div className="h-8 w-8 relative rounded-full bg-[#222b32] border border-white/10 flex items-center justify-center overflow-hidden">
                    <Image alt="User" fill className="object-cover" unoptimized src="https://lh3.googleusercontent.com/aida-public/AB6AXuDm8HbqRiQzswTKNQFWPtSfjF4IOzdIDTmRhqHFkbvUT8SO3uWuWFq1Rf4P0D6zw2QSKYNe9-LNathQsVJ8Fawhl5iBnMgNtp1_BRImTJ7jEKbu4VTE13BXcOzthENoVCgxmuPkn4cAKeYNrXi9RZQH_CtbSw8dNpdzbpyZozU8nxhV37f4uuZnKXckKVqrvDtKkub1S1chv5SPIt2cv2KbRygJ8mp_JRDrUfXg9BeiyI4eLFdmhhKO9jZGgAp_GadzYPGiMHiNdg7E"/>
                </div>
            </header>

            {/* Side Navigation Shell (Desktop) */}
            <aside className="fixed left-0 top-0 h-full w-64 hidden md:flex flex-col py-[32px] bg-[#0d0a0b]/90 backdrop-blur-2xl border-r border-white/10 shadow-2xl z-40">
                <div className="px-[40px] mb-[32px]">
                    <span className="font-['Plus_Jakarta_Sans'] text-[32px] leading-[40px] font-bold tracking-[-0.01em] text-[#454955]">TERMINAL_v1.0</span>
                </div>
                <nav className="flex flex-col gap-[8px]">
                    <div className="flex items-center gap-[8px] px-[40px] py-[8px] text-[#9E9DA0] hover:text-[#454955] hover:bg-white/5 transition-all cursor-pointer">
                        <span className="material-symbols-outlined">dashboard</span>
                        <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em]">Command Center</span>
                    </div>
                    <div className="flex items-center gap-[8px] px-[40px] py-[8px] text-[#454955] border-r-2 border-[#454955] bg-[#454955]/5 transition-all">
                        <span className="material-symbols-outlined">analytics</span>
                        <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em]">Deal Analyzer</span>
                    </div>
                    <div className="flex items-center gap-[8px] px-[40px] py-[8px] text-[#9E9DA0] hover:text-[#454955] hover:bg-white/5 transition-all cursor-pointer">
                        <span className="material-symbols-outlined">folder_shared</span>
                        <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em]">Data Room</span>
                    </div>
                    <div className="flex items-center gap-[8px] px-[40px] py-[8px] text-[#9E9DA0] hover:text-[#454955] hover:bg-white/5 transition-all cursor-pointer">
                        <span className="material-symbols-outlined">payments</span>
                        <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em]">Financing</span>
                    </div>
                    <div className="flex items-center gap-[8px] px-[40px] py-[8px] text-[#9E9DA0] hover:text-[#454955] hover:bg-white/5 transition-all cursor-pointer">
                        <span className="material-symbols-outlined">account_tree</span>
                        <span className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold uppercase tracking-[0.02em]">Workspaces</span>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="pt-24 pb-32 md:pl-64 flex justify-center px-[20px] md:px-[40px] min-h-screen">
                <div className="max-w-3xl w-full">
                    {/* Header Title */}
                    <div className="mb-[32px] flex flex-col items-center text-center">
                        <h2 className="font-['Plus_Jakarta_Sans'] text-[32px] leading-[40px] font-bold tracking-[-0.01em] text-[#9E9DA0] mb-[8px]">Valuation & Exit Strategy</h2>
                        <div className="h-1 w-12 bg-[#454955] rounded-full"></div>
                    </div>

                    {/* Central Glass Focus Card */}
                    <section 
                        className={`bg-[#1e1b20]/40 backdrop-blur-[24px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-xl p-[32px] md:p-12 flex flex-col gap-[32px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    >
                        {/* Hero ARV Input */}
                        <div className="flex flex-col gap-[8px]">
                            <label className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold text-[#9E9DA0] uppercase tracking-[0.02em]">Projected After Repair Value (ARV)</label>
                            <div className="relative flex items-baseline group">
                                <span className="font-['Plus_Jakarta_Sans'] text-[48px] leading-[56px] font-bold tracking-[-0.02em] text-[#454955] mr-2 opacity-80">$</span>
                                <input 
                                    className="bg-transparent border-none p-0 font-['JetBrains_Mono'] text-[64px] md:text-[80px] leading-tight text-[#9E9DA0] focus:ring-0 focus:outline-none w-full placeholder-white/10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                    type="number" 
                                    value={arv}
                                    onChange={(e) => setArv(Number(e.target.value))}
                                />
                            </div>
                            <div className="h-[1px] w-full bg-gradient-to-r from-[#454955]/50 to-transparent"></div>
                        </div>

                        {/* Secondary Inputs Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px]">
                            <div className="flex flex-col gap-[8px]">
                                <label className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold text-[#9E9DA0] uppercase tracking-[0.02em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                                    Expected Hold Time
                                </label>
                                <div className="bg-[#161318] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center group hover:border-[#454955]/30 transition-colors">
                                    <input 
                                        className="bg-transparent border-none p-0 font-['JetBrains_Mono'] text-[24px] leading-[32px] font-semibold text-[#9E9DA0] focus:ring-0 focus:outline-none w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                        type="number" 
                                        value={holdTime}
                                        onChange={(e) => setHoldTime(Number(e.target.value))}
                                    />
                                    <span className="font-['Plus_Jakarta_Sans'] text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0]">MONTHS</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-[8px]">
                                <label className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold text-[#9E9DA0] uppercase tracking-[0.02em] flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">handshake</span>
                                    Seller Concessions
                                </label>
                                <div className="bg-[#161318] border border-white/5 rounded-lg px-4 py-3 flex justify-between items-center group hover:border-[#454955]/30 transition-colors">
                                    <span className="font-['JetBrains_Mono'] text-[24px] leading-[32px] font-semibold text-[#454955] mr-1">$</span>
                                    <input 
                                        className="bg-transparent border-none p-0 font-['JetBrains_Mono'] text-[24px] leading-[32px] font-semibold text-[#9E9DA0] focus:ring-0 focus:outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                                        type="number" 
                                        value={sellerConcessions}
                                        onChange={(e) => setSellerConcessions(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Commission Slider */}
                        <div className="flex flex-col gap-[8px]">
                            <div className="flex justify-between items-center">
                                <label className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold text-[#9E9DA0] uppercase tracking-[0.02em]">Agent Commission</label>
                                <span className="font-['JetBrains_Mono'] text-[24px] leading-[32px] font-semibold text-[#454955]">{agentCommission}%</span>
                            </div>
                            <div className="relative h-6 flex items-center">
                                <input 
                                    className="w-full h-1 bg-[#262328] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:bg-[#454955] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(69,73,85,0.8)]" 
                                    max="6" 
                                    min="1" 
                                    step="0.5" 
                                    type="range" 
                                    value={agentCommission}
                                    onChange={(e) => setAgentCommission(Number(e.target.value))}
                                />
                            </div>
                            <div className="flex justify-between font-['Plus_Jakarta_Sans'] text-[12px] leading-[14px] font-medium tracking-[0.05em] text-[#9E9DA0] opacity-50 px-1">
                                <span>1%</span>
                                <span>3.5%</span>
                                <span>6%</span>
                            </div>
                        </div>

                        {/* Generative Insight Widget */}
                        <div className="bg-[#454955]/5 border border-[#454955]/20 rounded-xl p-[16px] flex gap-[16px] items-start animate-pulse">
                            <span className="material-symbols-outlined text-[#454955]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            <p className="font-['Plus_Jakarta_Sans'] text-[16px] leading-[24px] text-[#9E9DA0]">
                                Based on your ARV of <span className="font-['JetBrains_Mono'] font-bold">${arv.toLocaleString()}</span> and an agent commission of <span className="font-['JetBrains_Mono'] font-bold">{agentCommission}%</span>, expect <span className="font-['JetBrains_Mono'] font-bold text-[#454955]">${dispositionCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> in disposition costs.
                            </p>
                        </div>
                    </section>

                    {/* Supporting Imagery/Context */}
                    <div className="mt-[32px] grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <div className="bg-[#1e1b20]/40 backdrop-blur-[24px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-xl p-[16px] relative overflow-hidden group">
                            <Image alt="Market Analysis" fill unoptimized className="object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQQ_j2Hhz8FNgQE6uv0wsHCLrtPUjvKzQWQZiXCksxXxYn5xYu029oZrbL6zT4FffIdVypS7iCZs-G1bZRzhAtUqJ3mS9jWSU_RbjzD8cnSuD0Tl7roHIdZlVvs_KW6hB8MGhudj2vj22v0G5kAjBzYkHrs1XRd2Ej1_yBOYumc4pZe32CiFvrDU6ARet6Pt0KhI4ZBIMSLIaYl6cihz9uH6xEXQzxw86yfxTjB3GhDqoe9YM22OXHCqpDlqqbUV4IDucBL4XpXlyq"/>
                            <div className="relative z-10">
                                <h4 className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold text-[#454955] uppercase tracking-[0.02em] mb-1">Contextual Beta</h4>
                                <p className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[20px] text-[#9E9DA0]">Zip code 90210 currently shows a 3.2% absorption rate increase for properties at this ARV.</p>
                            </div>
                        </div>
                        <div className="bg-[#1e1b20]/40 backdrop-blur-[24px] border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] rounded-xl p-[16px] relative overflow-hidden group">
                            <Image alt="Disposition Strategy" fill unoptimized className="object-cover opacity-20 grayscale group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuABFMDCMecyjL-FkMJzjPBHrkJfOmTN9JRi4pT67rlkEzHQtl2uXbZVTRXrj93SAaCNCn35e8hQyiy1t5Nyx6Ji-afAZ_umYjmFpbYtoC87dzaptZsrOtUpQo5VPUVGzUA3CsBTCi1eNkbG4aefBA9qHAGoLyM9CeVRWtWXVIEFpUMnft28BjiNrC_TL_AYG4KqTTAbHbQo6voeJFjZsEmlYldhCqGFTagBX7QFiLAVELRAzhDLXkKR7-EgvHr8f-dkxfdwTubZNXhh"/>
                            <div className="relative z-10">
                                <h4 className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[16px] font-semibold text-[#454955] uppercase tracking-[0.02em] mb-1">Exit Strategy</h4>
                                <p className="font-['Plus_Jakarta_Sans'] text-[14px] leading-[20px] text-[#9E9DA0]">Recommended disposition: MLS Standard at 60 DOM for maximum liquidity yield.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Bottom Action */}
            <div className="fixed bottom-0 left-0 md:left-64 right-0 p-[16px] md:p-[32px] bg-gradient-to-t from-[#0d0a0b] to-transparent z-50 pointer-events-none">
                <div className="w-full max-w-3xl mx-auto pointer-events-auto">
                    <button className="w-full flex items-center justify-center gap-[8px] bg-[#454955] text-[#0d0a0b] font-['Plus_Jakarta_Sans'] text-[24px] leading-[32px] font-bold py-[16px] rounded-xl shadow-[0_0_20px_-5px_rgba(69,73,85,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-200">
                        <span>Generate Deal Pro-Forma</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>
            </div>

            {/* Bottom Navigation Shell (Mobile) */}
            <nav className="fixed bottom-0 w-full md:hidden z-50 bg-[#0d0a0b]/90 backdrop-blur-lg border-t border-white/10 shadow-[0_-10px_20px_-10px_rgba(69,73,85,0.1)] flex justify-around items-center h-20 pb-safe">
                <div className="flex flex-col items-center justify-center text-[#9E9DA0] opacity-60">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[12px] leading-[14px] font-medium tracking-[0.05em]">Center</span>
                </div>
                <div className="flex flex-col items-center justify-center text-[#454955] font-bold scale-110">
                    <span className="material-symbols-outlined">analytics</span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[12px] leading-[14px] font-medium tracking-[0.05em]">Analyzer</span>
                </div>
                <div className="flex flex-col items-center justify-center text-[#9E9DA0] opacity-60">
                    <span className="material-symbols-outlined">folder_shared</span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[12px] leading-[14px] font-medium tracking-[0.05em]">Data</span>
                </div>
                <div className="flex flex-col items-center justify-center text-[#9E9DA0] opacity-60">
                    <span className="material-symbols-outlined">payments</span>
                    <span className="font-['Plus_Jakarta_Sans'] text-[12px] leading-[14px] font-medium tracking-[0.05em]">Finance</span>
                </div>
            </nav>
        </div>
    );
}
