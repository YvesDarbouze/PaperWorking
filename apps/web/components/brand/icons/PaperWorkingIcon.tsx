import React from 'react';

/* PaperWorking icon mark (inline vector).
   Source: public/brand/icon.svg (canonical). Kept in sync manually.
   Inlined as JSX (not <img>/<Image src="...">) so `fill="currentColor"`
   resolves against CSS `color` of an ancestor element. */

export function PaperWorkingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 300"
      fill="currentColor"
      {...props}
    >
      <path d="M 28 0 H 172 A 28 28 0 0 1 200 28 V 105 A 28 28 0 0 0 228 133 H 572 A 28 28 0 0 0 600 105 V 28 A 28 28 0 0 1 628 0 H 772 A 28 28 0 0 1 800 28 V 272 A 28 28 0 0 1 772 300 H 28 A 28 28 0 0 1 0 272 V 28 A 28 28 0 0 1 28 0 Z" />
    </svg>
  );
}

export default PaperWorkingIcon;
