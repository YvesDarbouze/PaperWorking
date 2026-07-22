import React, { useState } from 'react';
import { Project } from '@/types/schema';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface Vendor {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  latitude: number;
  longitude: number;
  rating: number;
}

const MOCK_VENDORS: Vendor[] = [
  // Inspection
  { id: 'v1', name: 'Oregon Home Inspectors', specialty: 'Inspector', phone: '503-555-0199', email: 'info@oregoninspect.com', latitude: 45.523, longitude: -122.676, rating: 4.8 },
  { id: 'v2', name: 'Cascade Property Reviews', specialty: 'Inspector', phone: '503-555-0211', email: 'contact@cascadereviews.com', latitude: 45.489, longitude: -122.712, rating: 4.5 },
  { id: 'v3', name: 'Willamette Inspectors Group', specialty: 'Inspector', phone: '503-555-0344', email: ' Willamette@inspectors.org', latitude: 45.602, longitude: -122.589, rating: 4.2 },
  
  // Title Company
  { id: 'v4', name: 'WFG National Title', specialty: 'Title Company', phone: '503-555-1022', email: 'closing@wfgtitle.com', latitude: 45.512, longitude: -122.654, rating: 4.9 },
  { id: 'v5', name: 'Fidelity National Title Portland', specialty: 'Title Company', phone: '503-555-1044', email: 'portlandteam@fnf.com', latitude: 45.519, longitude: -122.682, rating: 4.7 },

  // Surveyor
  { id: 'v6', name: 'Apex Land Surveyors', specialty: 'Surveyor', phone: '503-555-2011', email: 'surveys@apexland.com', latitude: 45.531, longitude: -122.691, rating: 4.6 },
  { id: 'v7', name: 'Compass Geomatics', specialty: 'Surveyor', phone: '503-555-2088', email: 'info@compassgeo.com', latitude: 45.452, longitude: -122.756, rating: 4.4 },

  // Environmental Consultant
  { id: 'v8', name: 'EcoSafe Phase I Consultants', specialty: 'Environmental Consultant', phone: '503-555-3012', email: 'phase1@ecosafeenv.com', latitude: 45.528, longitude: -122.661, rating: 4.8 },
  { id: 'v9', name: 'Columbia Basin Environmental', specialty: 'Environmental Consultant', phone: '503-555-3045', email: 'reports@columbiaenv.com', latitude: 45.567, longitude: -122.605, rating: 4.3 },

  // HOA Consultant
  { id: 'v10', name: 'HOA Audit Experts', specialty: 'HOA Consultant', phone: '503-555-4011', email: 'audits@hoaxperts.com', latitude: 45.515, longitude: -122.678, rating: 4.7 },

  // Attorney
  { id: 'v11', name: 'NW Closing Attorneys LLP', specialty: 'Attorney', phone: '503-555-5022', email: 'closings@nwclosinglaw.com', latitude: 45.511, longitude: -122.674, rating: 4.9 },
  { id: 'v12', name: 'Vance & Associates Real Estate Law', specialty: 'Attorney', phone: '503-555-5099', email: 'info@vancelawportland.com', latitude: 45.501, longitude: -122.689, rating: 4.5 },

  // Zoning Consultant
  { id: 'v13', name: 'Urban Planning & Zoning Partners', specialty: 'Zoning Consultant', phone: '503-555-6011', email: 'zoning@urbanplanning.com', latitude: 45.522, longitude: -122.679, rating: 4.7 },

  // Insurance Carrier
  { id: 'v14', name: 'Pacific Northwest Hazard Underwriters', specialty: 'Insurance Carrier', phone: '503-555-7011', email: 'quotes@pnwhazard.com', latitude: 45.534, longitude: -122.645, rating: 4.6 },
];

interface VendorMatchListProps {
  project: Project;
  specialty: string;
}

export function VendorMatchList({ project, specialty }: VendorMatchListProps) {
  const projectLat = project.latitude ?? null;
  const projectLng = project.longitude ?? null;

  const [notifiedVendors, setNotifiedVendors] = useState<string[]>([]);

  // Filter and sort vendors by distance
  const matchedVendors = MOCK_VENDORS
    .filter(v => v.specialty.toLowerCase() === specialty.toLowerCase())
    .map(v => {
      const distance = (projectLat !== null && projectLng !== null)
        ? Math.sqrt(Math.pow(v.latitude - projectLat, 2) + Math.pow(v.longitude - projectLng, 2)) * 69
        : null;
      return { ...v, distance };
    })
    .sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    })
    .slice(0, 3); // Top 3 closest

  const handleNotify = (vendor: Vendor) => {
    setNotifiedVendors(prev => [...prev, vendor.id]);
    
    // Exact audit log format required by AC4
    console.log(`[Vendor Notification] Dispatching email to: ${vendor.name} (${vendor.email}) for Project: ${project.propertyName || project.address} (Specialty: ${specialty})`);
    
    toast.success(`Notification successfully dispatched to: ${vendor.name}`);
  };

  if (matchedVendors.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 text-left">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <span className="text-[10px] font-bold text-[#9E9DA0] uppercase tracking-wider block">Geo-Matched Vendors ({specialty})</span>
        <span className="text-[9px] text-[#9E9DA0] font-mono">Location: {projectLat !== null && projectLng !== null ? `${projectLat.toFixed(3)}, ${projectLng.toFixed(3)}` : 'location not geocoded'}</span>
      </div>

      {projectLat === null && (
        <div className="text-[10px] text-amber-400 font-medium">
          ⚠️ location not geocoded — unable to compute vendor distance.
        </div>
      )}

      <div className="space-y-3">
        {matchedVendors.map(v => {
          const isNotified = notifiedVendors.includes(v.id);
          return (
            <div key={v.id} className="flex items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">{v.name}</span>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#454955]/20 text-[#9E9DA0]">
                    ⭐ {v.rating}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#9E9DA0]">
                  <span className="flex items-center gap-1">
                    <MapPin size={10} />
                    {v.distance !== null ? `${v.distance.toFixed(1)} miles away` : 'location not geocoded'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone size={10} />
                    {v.phone}
                  </span>
                </div>
              </div>

              <button
                id={`btn-notify-vendor-${v.id}`}
                onClick={() => handleNotify(v)}
                disabled={isNotified}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  isNotified
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-[#454955] hover:bg-[#454955]/80 text-[#0d0a0b]'
                }`}
              >
                {isNotified ? (
                  <>
                    <Check size={10} />
                    Sent
                  </>
                ) : (
                  <>
                    <Send size={10} />
                    Notify
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
