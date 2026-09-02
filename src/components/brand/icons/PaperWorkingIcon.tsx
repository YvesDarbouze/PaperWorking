import React from 'react';

/* ═══════════════════════════════════════════════════════
   PaperWorking — Icon mark (inline, vector)

   Source: public/brand/icon.svg (canonical). Kept in sync
   manually — this file must not diverge from that source.

   Inlined as JSX (not <img>/<Image src="...">) so `fill="currentColor"`
   actually resolves against the CSS `color` of an ancestor element —
   that only works for SVG embedded in the DOM, not for externally
   referenced SVG files.
   ═══════════════════════════════════════════════════════ */

export function PaperWorkingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      fill="currentColor"
      {...props}
    >
      <path d="M878.67,362h-133.33c-18.33,0-33.33,15-33.33,33.33v66.14c0,18.33-15,33.33-33.33,33.33h-333.34c-18.33,0-33.33-15-33.33-33.33v-66.14c0-18.33-15-33.33-33.34-33.33H145.33c-18.33,0-33.33,15-33.33,33.33v231.77c0,18.33,15,33.33,33.33,33.33h733.34c18.33,0,33.33-15,33.33-33.33v-231.77c0-18.33-15-33.33-33.33-33.33Z" />
    </svg>
  );
}

export default PaperWorkingIcon;
