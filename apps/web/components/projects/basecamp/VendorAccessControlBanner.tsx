import { ShieldCheck, Eye, EyeSlash } from '@phosphor-icons/react';

export default function VendorAccessControlBanner({
  vendorMode,
  onToggleVendorMode,
}: {
  vendorMode: boolean;
  onToggleVendorMode: (active: boolean) => void;
}) {
  return (
    <div
      className={`rounded-none border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
        vendorMode
          ? 'border-border bg-muted/60 text-foreground'
          : 'border-border bg-card text-foreground'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`p-1.5 rounded-none border border-border ${vendorMode ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>
          <ShieldCheck size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground tracking-tight">
              {vendorMode ? 'Vendor / Guest Preview Mode Active' : 'Investment Team View (Full Access)'}
            </span>
            <span className="text-[10px] font-mono uppercase rounded-none border border-border px-1.5 py-0.5 bg-muted/40 text-muted-foreground">
              Involvement Controls
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {vendorMode
              ? 'Previewing what subcontractors and inspectors see: private financials, investor equity splits, and internal team threads are hidden.'
              : 'You have full internal visibility. Switch to Vendor Mode to verify external contractor permissions.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onToggleVendorMode(!vendorMode)}
        className={`inline-flex items-center gap-1.5 rounded-none px-3.5 py-2 text-xs font-medium transition min-h-[44px] shrink-0 ${
          vendorMode
            ? 'bg-foreground text-background hover:bg-foreground/90'
            : 'border border-border bg-background text-foreground hover:bg-muted'
        }`}
      >
        {vendorMode ? <EyeSlash size={16} /> : <Eye size={16} />}
        <span>{vendorMode ? 'Exit Vendor Mode' : 'Preview Vendor View'}</span>
      </button>
    </div>
  );
}
