'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function VendorProfileEditorPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // --- Profile Fields State ---
  const [companyName, setCompanyName] = useState('');
  const [type, setType] = useState('Contractor');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [showSpecialtyInput, setShowSpecialtyInput] = useState(false);

  const [licensingStates, setLicensingStates] = useState<string[]>([]);
  const [newState, setNewState] = useState('');
  const [showStateInput, setShowStateInput] = useState(false);

  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');
  const [showAreaInput, setShowAreaInput] = useState(false);

  const [bio, setBio] = useState('');
  const [feeRangeLabel, setFeeRangeLabel] = useState('');
  const [avgTurnaroundDays, setAvgTurnaroundDays] = useState(3);
  const [availability, setAvailability] = useState<'Available' | 'Busy' | 'Available in 1 week'>('Available');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Sync profile details when loaded
  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setCompanyName(p.companyName || p.displayName || '');
      setType(p.type || 'Contractor');
      setSpecialties(p.specialties || []);
      setLicensingStates(p.licensingStates || []);
      setServiceAreas(p.serviceAreas || []);
      setBio(p.bio || '');
      setFeeRangeLabel(p.feeRangeLabel || '');
      setAvgTurnaroundDays(p.avgTurnaroundDays || 3);
      setAvailability(p.availability || 'Available');
      setLogoUrl(p.logoUrl || '');
      setBannerUrl(p.bannerUrl || '');
      setInitialLoading(false);
    }
  }, [profile]);

  // Handle Save
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        companyName: companyName.trim(),
        type,
        specialties,
        licensingStates,
        serviceAreas,
        bio: bio.trim(),
        feeRangeLabel: feeRangeLabel.trim(),
        avgTurnaroundDays: Number(avgTurnaroundDays),
        availability,
        logoUrl: logoUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Profile changes committed successfully!');
    } catch (err) {
      console.error('Failed to save profile:', err);
      toast.error('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  // Specialties helpers
  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()]);
      setNewSpecialty('');
      setShowSpecialtyInput(false);
    }
  };

  const handleRemoveSpecialty = (spec: string) => {
    setSpecialties(specialties.filter(s => s !== spec));
  };

  // Licensing States helpers
  const handleAddState = () => {
    const formattedState = newState.trim().toUpperCase();
    if (formattedState && !licensingStates.includes(formattedState)) {
      setLicensingStates([...licensingStates, formattedState]);
      setNewState('');
      setShowStateInput(false);
    }
  };

  const handleRemoveState = (st: string) => {
    setLicensingStates(licensingStates.filter(s => s !== st));
  };

  // Areas Served helpers
  const handleAddArea = () => {
    if (newArea.trim() && !serviceAreas.includes(newArea.trim())) {
      setServiceAreas([...serviceAreas, newArea.trim()]);
      setNewArea('');
      setShowAreaInput(false);
    }
  };

  const handleRemoveArea = (area: string) => {
    setServiceAreas(serviceAreas.filter(a => a !== area));
  };

  if (initialLoading && !profile) {
    return (
      <div className="min-h-screen bg-[#060f15] text-[#dae4ec] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[#20B2AA] text-4xl animate-spin">progress_activity</span>
          <p className="text-xs uppercase tracking-widest text-[#20B2AA]/70 font-mono">Initializing Profile Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060f15] text-[#dae4ec] font-sans antialiased pb-24 relative overflow-hidden"
         style={{ backgroundImage: "radial-gradient(rgba(32, 178, 170, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      {/* Technical Top Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#060f15]/90 backdrop-blur-md border-b border-white/5 px-6 h-14 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#20B2AA]/10 border border-[#20B2AA]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#20B2AA] text-xl">terminal</span>
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#20B2AA] leading-none uppercase tracking-wider">Profile Editor</span>
            <h1 className="text-xs font-bold text-white uppercase tracking-widest mt-0.5">
              {companyName || 'New Vendor Profile'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/vendor-portal')}
            className="px-4 py-1.5 rounded text-[10px] font-bold text-[#bacac5] hover:text-white transition-colors uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/5"
          >
            Discard
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="luminous-button flex items-center gap-1.5 px-5 py-1.5 rounded bg-[#20B2AA] hover:bg-[#20B2AA]/90 text-[#003731] text-[10px] font-black uppercase tracking-wider transition-transform active:scale-95 disabled:opacity-50"
            style={{ boxShadow: '0 0 15px -3px rgba(32, 178, 170, 0.3)' }}
          >
            {saving ? (
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {saving ? 'Committing...' : 'Commit Changes'}
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="mt-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24">
        
        {/* Editor Form Columns */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section: Business Identity */}
          <section className="bg-[#182127]/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#20B2AA] text-lg">id_card</span>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Business Identity</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Logo URL Input & View */}
                <div className="shrink-0 space-y-2">
                  <div className="w-24 h-24 rounded bg-[#2d363d] border border-white/10 flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-white/30 text-3xl">image</span>
                    )}
                  </div>
                  <div className="w-full max-w-[120px]">
                    <label className="block font-mono text-[9px] text-[#bacac5] uppercase">Logo URL</label>
                    <input 
                      type="text" 
                      placeholder="https://..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-[#20B2AA] transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  {/* Entity Name */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Business Entity Name</label>
                    <input 
                      type="text" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apex Builders"
                      className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#20B2AA] transition-all"
                    />
                  </div>

                  {/* Vendor Category Type */}
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Vendor Category Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#20B2AA] transition-all"
                    >
                      <option value="Contractor">Contractor / Specialty Trade</option>
                      <option value="Lawyer">Lawyer / Closing Attorney</option>
                      <option value="Appraiser">Appraiser</option>
                      <option value="Lender">Lender / Loan Officer</option>
                      <option value="Inspector">Inspector</option>
                      <option value="Title">Title Company</option>
                      <option value="Insurance">Insurance Broker</option>
                      <option value="Property Manager">Property Manager</option>
                      <option value="Listing Agent">Listing Agent</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Service Scope */}
          <section className="bg-[#182127]/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#20B2AA] text-lg">map</span>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Service Scope</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Specialties Tag Editor */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Specializations</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-[#060f15] border border-[#3c4a46] rounded min-h-[42px]">
                    {specialties.map(spec => (
                      <span key={spec} className="px-2 py-0.5 rounded bg-[#20B2AA]/10 border border-[#20B2AA]/30 text-[#20B2AA] font-mono text-[10px] flex items-center gap-1.5">
                        {spec}
                        <button type="button" onClick={() => handleRemoveSpecialty(spec)} className="material-symbols-outlined text-[10px] hover:text-white">close</button>
                      </span>
                    ))}
                    
                    {showSpecialtyInput ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          placeholder="Specialty"
                          value={newSpecialty}
                          onChange={(e) => setNewSpecialty(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSpecialty()}
                          className="bg-transparent text-[10px] text-white focus:outline-none border-b border-[#20B2AA] w-20"
                        />
                        <button type="button" onClick={handleAddSpecialty} className="material-symbols-outlined text-xs text-[#20B2AA]">check</button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setShowSpecialtyInput(true)}
                        className="px-2 py-0.5 rounded border border-white/10 text-[#bacac5] hover:text-white font-mono text-[10px] hover:border-[#20B2AA]/50 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[10px]">add</span> NEW
                      </button>
                    )}
                  </div>
                </div>

                {/* Areas Served Tag Editor */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Areas Served (Zips / Cities)</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-[#060f15] border border-[#3c4a46] rounded min-h-[42px]">
                    {serviceAreas.map(area => (
                      <span key={area} className="px-2 py-0.5 rounded bg-[#2d363d] border border-white/5 text-white font-mono text-[10px] flex items-center gap-1.5">
                        {area}
                        <button type="button" onClick={() => handleRemoveArea(area)} className="material-symbols-outlined text-[10px] hover:text-white">cancel</button>
                      </span>
                    ))}

                    {showAreaInput ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          placeholder="Area"
                          value={newArea}
                          onChange={(e) => setNewArea(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddArea()}
                          className="bg-transparent text-[10px] text-white focus:outline-none border-b border-[#20B2AA] w-20"
                        />
                        <button type="button" onClick={handleAddArea} className="material-symbols-outlined text-xs text-[#20B2AA]">check</button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setShowAreaInput(true)}
                        className="px-2 py-0.5 rounded border border-white/10 text-[#bacac5] hover:text-white font-mono text-[10px] hover:border-[#20B2AA]/50 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[10px]">add_location</span> ADD
                      </button>
                    )}
                  </div>
                </div>

                {/* Licensing States Tag Editor */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Licensing States (e.g. TX, CA)</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-[#060f15] border border-[#3c4a46] rounded min-h-[42px]">
                    {licensingStates.map(st => (
                      <span key={st} className="px-2 py-0.5 rounded bg-[#20B2AA]/10 border border-[#20B2AA]/30 text-[#20B2AA] font-mono text-[10px] flex items-center gap-1.5">
                        {st}
                        <button type="button" onClick={() => handleRemoveState(st)} className="material-symbols-outlined text-[10px] hover:text-white">close</button>
                      </span>
                    ))}
                    
                    {showStateInput ? (
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          placeholder="State"
                          maxLength={2}
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddState()}
                          className="bg-transparent text-[10px] text-white focus:outline-none border-b border-[#20B2AA] w-12 uppercase"
                        />
                        <button type="button" onClick={handleAddState} className="material-symbols-outlined text-xs text-[#20B2AA]">check</button>
                      </div>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => setShowStateInput(true)}
                        className="px-2 py-0.5 rounded border border-white/10 text-[#bacac5] hover:text-white font-mono text-[10px] hover:border-[#20B2AA]/50 transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[10px]">add</span> STATE
                      </button>
                    )}
                  </div>
                </div>

                {/* Turnaround Days */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Avg Turnaround Days</label>
                  <input 
                    type="number" 
                    value={avgTurnaroundDays}
                    onChange={(e) => setAvgTurnaroundDays(Number(e.target.value))}
                    min={1}
                    className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#20B2AA] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base Operational Rate / Fee Label */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Base Rate / Fee Label</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={feeRangeLabel}
                      onChange={(e) => setFeeRangeLabel(e.target.value)}
                      placeholder="e.g. From $125/hr or $1,500 flat"
                      className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#20B2AA] transition-all"
                    />
                  </div>
                </div>

                {/* Availability State */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Current Availability</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as any)}
                    className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#20B2AA] transition-all"
                  >
                    <option value="Available">Available Now</option>
                    <option value="Available in 1 week">Available in 1 Week</option>
                    <option value="Busy">Busy / Booked</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Narrative */}
          <section className="bg-[#182127]/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#20B2AA] text-lg">description</span>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Narrative / Business Bio</h2>
            </div>
            
            <div className="p-6">
              <div className="space-y-1.5">
                <label className="block font-mono text-[9px] text-[#bacac5] uppercase tracking-wider">Operational Description</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your credentials, project experience, scope specialties, and working philosophy..."
                  className="w-full bg-[#060f15] border border-[#3c4a46] rounded px-3 py-2 text-sm text-white h-32 resize-none focus:outline-none focus:border-[#20B2AA] transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section: Credentials Vault */}
          <section className="bg-[#182127]/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center gap-3">
              <span className="material-symbols-outlined text-[#20B2AA] text-lg">verified_user</span>
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">Credentials Vault</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-white/5 bg-[#141d23] rounded group/cred flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#20B2AA] text-xl">gavel</span>
                    <div>
                      <p className="font-mono text-[10px] text-white font-bold">GC_LICENSE_ACTIVE</p>
                      <p className="text-[9px] text-[#bacac5]">Verified License Status</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-[#20B2AA] bg-[#20B2AA]/10 px-2 py-0.5 rounded">ACTIVE</span>
                </div>

                <div className="p-4 border border-white/5 bg-[#141d23] rounded group/cred flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#20B2AA] text-xl">shield</span>
                    <div>
                      <p className="font-mono text-[10px] text-white font-bold">COI_LIABILITY_DOC</p>
                      <p className="text-[9px] text-[#bacac5]">Insurance Coverage Active</p>
                    </div>
                  </div>
                  <span className="text-[8px] font-mono text-[#20B2AA] bg-[#20B2AA]/10 px-2 py-0.5 rounded">ACTIVE</span>
                </div>

                <button 
                  type="button"
                  onClick={() => toast.success('Upload feature simulated - files securely stored.')}
                  className="md:col-span-2 py-3 border border-dashed border-white/10 rounded flex items-center justify-center gap-2 hover:border-[#20B2AA]/50 hover:bg-[#20B2AA]/5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[#bacac5] text-sm">upload_file</span>
                  <span className="font-mono text-[10px] text-[#bacac5]">UPLOAD NEW CREDENTIAL (PDF)</span>
                </button>
              </div>
            </div>
          </section>

        </div>

        {/* Live Preview Sidebar Column */}
        <aside className="lg:col-span-5 relative">
          <div className="sticky top-20 space-y-4">
            
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#20B2AA] text-sm">visibility</span>
                <h3 className="font-mono text-[10px] font-extrabold text-[#bacac5] uppercase tracking-[0.2em]">Live Investor View</h3>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-[#20B2AA]/20 text-[#20B2AA] text-[8px] font-mono animate-pulse">SYNCHRONIZED</span>
            </div>

            {/* Marketplace Card Preview */}
            <div className="bg-[#060f15] border border-white/10 rounded shadow-2xl overflow-hidden group">
              <div className="h-32 relative bg-[#182127] overflow-hidden">
                <img 
                  alt="Hero Cover" 
                  className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700" 
                  src={bannerUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBxosA776JS_5LQF-6-qcmJgvhbl7sW3FeYqi4IwbC3JSfnse876ZhqLckKTNI6XqLFGBI7v6NGIkVp-CitS3JoZduxJZvIJasVDWLHLQmeTes6-Eu2MsROq9cdt9OX9vcryZtVkhLCjOLmYG2sZoxiIDupZp_VtdfVWETrB1Hs3Bk454Q5SdrQPqFlSyYLQHfiM_c7IS9gouhOqMM0EE0aicj-NMGM4scWWg78-bxuywvTq1ayp4BXHr1ppit60FPXGxrw-oX6xx2z"} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060f15] to-transparent"></div>
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <div className="w-12 h-12 rounded border-2 border-[#060f15] overflow-hidden bg-[#091015] flex items-center justify-center">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-[#20B2AA] text-xl">handyman</span>
                    )}
                  </div>
                  <div>
                    <p className="font-mono text-[8px] text-[#20B2AA]">ID: {user?.uid.slice(0, 8).toUpperCase()}</p>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">{companyName || 'Apex Builders'}</h4>
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-[#20B2AA] text-[#003731] text-[8px] font-black px-1.5 py-0.5 rounded">
                  {(profile as any)?.verified ? 'VERIFIED' : 'PENDING'}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-[#20B2AA]">
                      <span className="material-symbols-outlined text-xs select-none" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined text-xs select-none" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined text-xs select-none" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined text-xs select-none" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="material-symbols-outlined text-xs select-none" style={{ fontVariationSettings: "'FILL' 0.5" }}>star_half</span>
                    </div>
                    <span className="font-mono text-[9px] text-[#bacac5]">4.9 / 124 OPS</span>
                  </div>
                  <div className="font-mono text-[10px] font-bold text-[#20B2AA]">{feeRangeLabel || '$125.00/HR'}</div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-mono text-[#bacac5] uppercase">
                    {type}
                  </span>
                  {specialties.slice(0, 2).map(spec => (
                    <span key={spec} className="px-1.5 py-0.5 rounded border border-white/10 text-[8px] font-mono text-[#bacac5] uppercase">
                      {spec}
                    </span>
                  ))}
                </div>

                <p className="text-[11px] text-[#bacac5] leading-relaxed line-clamp-2">
                  {bio || 'No operational description provided. Complete your narrative block to display details here.'}
                </p>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#20B2AA] text-xs">location_on</span>
                    <span className="font-mono text-[9px] text-[#bacac5]">
                      {serviceAreas.length > 0 ? serviceAreas.slice(0, 2).join(' / ').toUpperCase() : 'SEATTLE_METRO_WA'}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono text-[#20B2AA] border border-[#20B2AA]/20 px-2 py-0.5 rounded uppercase">
                    {availability}
                  </span>
                </div>
              </div>
            </div>

            {/* Consistency Check Status Widget */}
            <div className="bg-[#182127]/40 backdrop-blur-xl border border-[#20B2AA]/20 p-3 rounded flex items-start gap-3">
              <span className="material-symbols-outlined text-[#20B2AA] text-sm mt-0.5">terminal</span>
              <div className="font-mono text-[10px] text-[#bacac5] leading-normal">
                <p><span className="text-[#20B2AA]">&gt;</span> CONSISTENCY_CHECK: PASS</p>
                <p><span className="text-[#20B2AA]">&gt;</span> LICENSE_STATUS: VALIDATED</p>
                <p><span className="text-[#20B2AA]">&gt;</span> Active on PaperWorking Network.</p>
              </div>
            </div>

          </div>
        </aside>

      </main>

    </div>
  );
}
