'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Info, Edit3, Loader2, Home, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

interface PropertySearchStepProps {
  projectId: string;
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function PropertySearchStep({
  projectId,
  initialData,
  onSave,
}: PropertySearchStepProps) {
  const { user } = useAuth();
  const f = initialData?.financials || {};

  const [query, setQuery] = useState(initialData?.propertyName || initialData?.addressLine || '');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Property Details State
  const [beds, setBeds] = useState<number>(initialData?.propertyFacts?.beds || f.beds || 3);
  const [baths, setBaths] = useState<number>(initialData?.propertyFacts?.baths || f.baths || 2);
  const [sqft, setSqft] = useState<number>(initialData?.propertyFacts?.sqft || f.sqft || 1800);
  const [yearBuilt, setYearBuilt] = useState<number>(initialData?.propertyFacts?.yearBuilt || f.yearBuilt || 1995);
  const [lotSqft, setLotSqft] = useState<number>(initialData?.propertyFacts?.lotSqft || f.lotSqft || 6500);
  const [propertyType, setPropertyType] = useState<string>(initialData?.propertyType || initialData?.propertyFacts?.propertyType || 'Single Family');
  const [photoUrl, setPhotoUrl] = useState<string>(initialData?.propertyFacts?.photoUrl || '');

  // AVM estimates
  const [avmValue, setAvmValue] = useState<number>(f.avmPriceCents ? f.avmPriceCents / 100 : (f.purchasePrice ? f.purchasePrice / 100 : 250000));
  const [estRent, setEstRent] = useState<number>(f.estRentCents ? f.estRentCents / 100 : (f.grossRent || 1800));

  const [addressLine, setAddressLine] = useState(initialData?.addressLine || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [zip, setZip] = useState(initialData?.zip || initialData?.zipCode || '');

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  // Handle Autocomplete predictions
  const fetchPredictions = async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    try {
      const res = await fetch('/api/places/autocomplete-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
        setIsOpen((data.predictions || []).length > 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 300);
  };

  const handleSelectPrediction = async (prediction: any) => {
    setQuery(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    setLoading(true);

    try {
      const idToken = await user?.getIdToken();

      // First, resolve the address line components
      const detailsRes = await fetch(`/api/places/autocomplete-public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: prediction.description }), // trigger address resolving
      });

      // Save initial address components
      const addressParts = prediction.description.split(', ');
      const street = addressParts[0] || '';
      const c = addressParts[1] || '';
      const sWithZip = addressParts[2] || '';
      const sParts = sWithZip.split(' ');
      const s = sParts[0] || '';
      const z = sParts[1] || '';

      setAddressLine(street);
      setCity(c);
      setState(s);
      setZip(z);

      // Now query /api/reil/projects/[id]/property to trigger RentCast enrichment and database save
      const enrichRes = await fetch(`/api/reil/projects/${projectId}/property`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          placeId: prediction.placeId,
          addressLine: prediction.description,
        }),
      });

      if (!enrichRes.ok) {
        throw new Error('Enrichment failed');
      }

      const enrichData = await enrichRes.json();
      
      // Auto-populate facts if available
      const facts = enrichData.facts || {};
      if (facts.beds) setBeds(facts.beds);
      if (facts.baths) setBaths(facts.baths);
      if (facts.sqft) setSqft(facts.sqft);
      if (facts.yearBuilt) setYearBuilt(facts.yearBuilt);
      if (facts.lotSqft) setLotSqft(facts.lotSqft);
      if (facts.propertyType) setPropertyType(facts.propertyType);
      if (facts.photoUrl) setPhotoUrl(facts.photoUrl);
      if (facts.avmPriceCents) setAvmValue(facts.avmPriceCents / 100);
      if (facts.estRentCents) setEstRent(facts.estRentCents / 100);

      toast.success('Property details imported from RentCast!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to auto-fetch details. Please input attributes manually.');
      
      // Fallback fallback details
      setAddressLine(prediction.description);
      setPhotoUrl('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=640&q=80');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!addressLine) {
      toast.error('Please select or specify a target property address.');
      return;
    }

    const payload = {
      address: addressLine,
      addressLine,
      city,
      state,
      zip,
      propertyName: query,
      propertyType,
      condition: initialData?.condition || 'Good',
      units: 1, // default single-family base units
      propertyFacts: {
        beds,
        baths,
        sqft,
        yearBuilt,
        lotSqft,
        photoUrl,
        propertyType,
        sourceProvider: 'RentCast API',
        fetchedAt: new Date().toISOString(),
      },
      financials: {
        ...f,
        beds,
        baths,
        sqft,
        yearBuilt,
        purchasePrice: avmValue * 100, // Pre-fill purchase price with AVM value
        grossRent: estRent,
        monthlyGrossRent: estRent,
        avmPriceCents: avmValue * 100,
        estRentCents: estRent * 100,
      },
    };

    await onSave(payload);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 3: Property Selection</h3>
        <p className="text-xs text-slate-400">Search and verify physical parameters and estimates of the target deal.</p>
      </div>

      <div className="space-y-4">
        {/* Address Search Bar */}
        <div ref={containerRef} className="relative space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Property Search Address</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Start typing property address..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
            {loading && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-emerald-500 animate-spin" />}
          </div>

          {isOpen && predictions.length > 0 && (
            <ul className="absolute z-50 w-full bg-[#181315] border border-white/10 rounded-xl mt-1 shadow-2xl overflow-hidden divide-y divide-white/5 max-h-60 overflow-y-auto">
              {predictions.map((p: any) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onClick={() => handleSelectPrediction(p)}
                    className="w-full text-left px-4 py-3 text-xs text-slate-200 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{p.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Details Card and Manual Adjusters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Photo & AVM Card */}
          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-4 flex flex-col justify-between">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Property preview"
                className="w-full h-32 object-cover rounded-lg border border-white/10"
              />
            ) : (
              <div className="w-full h-32 bg-white/5 rounded-lg border border-dashed border-white/10 flex items-center justify-center flex-col text-slate-600">
                <Home className="w-8 h-8 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider">No Photo Available</span>
              </div>
            )}
            <div className="space-y-2.5">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">RentCast Value AVM</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={avmValue || ''}
                    onChange={(e) => setAvmValue(Number(e.target.value))}
                    className="w-full py-1 px-2 text-xs font-bold text-white bg-white/5 border border-white/10 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-slate-500">RentCast Rental AVM</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={estRent || ''}
                    onChange={(e) => setEstRent(Number(e.target.value))}
                    className="w-full py-1 px-2 text-xs font-bold text-white bg-white/5 border border-white/10 rounded-lg animate-in"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Physical attributes manual adjusters */}
          <div className="md:col-span-2 grid grid-cols-2 gap-3.5 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <h4 className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" /> Override Property Parameters
            </h4>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Beds</label>
              <input
                type="number"
                value={beds || ''}
                onChange={(e) => setBeds(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Baths</label>
              <input
                type="number"
                value={baths || ''}
                onChange={(e) => setBaths(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Living Sqft</label>
              <input
                type="number"
                value={sqft || ''}
                onChange={(e) => setSqft(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Year Built</label>
              <input
                type="number"
                value={yearBuilt || ''}
                onChange={(e) => setYearBuilt(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Lot Sqft</label>
              <input
                type="number"
                value={lotSqft || ''}
                onChange={(e) => setLotSqft(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="Single Family" className="bg-[#181315]">Single Family</option>
                <option value="Condo" className="bg-[#181315]">Condo</option>
                <option value="Townhouse" className="bg-[#181315]">Townhouse</option>
                <option value="Multi-Family" className="bg-[#181315]">Multi-Family</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={handleContinue}
          disabled={!addressLine}
          className="px-6 py-2.5 bg-emerald-500 text-[#0d0a0b] disabled:opacity-50 hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
