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
      viewBox="0 0 512 474"
      fill="currentColor"
      {...props}
    >
      <rect x="32" y="185" width="448" height="53" rx="1" ry="1" />
      <rect x="32" y="92" width="448" height="53" rx="1" ry="1" />
      <rect x="32" y="0" width="448" height="53" rx="1" ry="1" />
      <path d="M363,330v-26.5c0-9.7,2.24-18.68,5.92-26.5h-224.84c3.66,7.82,5.92,16.8,5.92,26.5v26.5h213Z" />
      <path d="M490.67,283h-85.33c-11.73,0-21.33,9.6-21.33,21.33v42.33c0,11.73-9.6,21.33-21.33,21.33h-213.33c-11.73,0-21.33-9.6-21.33-21.33v-42.33c0-11.73-9.6-21.33-21.33-21.33H21.33c-11.73,0-21.33,9.6-21.33,21.33v148.33c0,11.73,9.6,21.33,21.33,21.33h469.33c11.73,0,21.33-9.6,21.33-21.33v-148.33c0-11.73-9.6-21.33-21.33-21.33Z" />
    </svg>
  );
}

export default PaperWorkingIcon;
