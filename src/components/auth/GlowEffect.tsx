'use client';

import React, { useEffect, useRef } from 'react';

export default function GlowEffect() {
  const glow1Ref = useRef<HTMLDivElement>(null);
  const glow2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (glow1Ref.current) {
        const targetX1 = x - 150;
        const targetY1 = y - 150;
        glow1Ref.current.style.transform = `translate(${targetX1 * 0.02}px, ${targetY1 * 0.02}px)`;
      }

      if (glow2Ref.current) {
        const targetX2 = x - 150;
        const targetY2 = y - 150;
        glow2Ref.current.style.transform = `translate(${targetX2 * 0.04}px, ${targetY2 * 0.04}px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      <div
        ref={glow1Ref}
        className="absolute w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(87,241,219,0.05)_0%,transparent_70%)] pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{ top: '-100px', left: '-100px' }}
      />
      <div
        ref={glow2Ref}
        className="absolute w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(87,241,219,0.05)_0%,transparent_70%)] pointer-events-none z-0 transition-transform duration-300 ease-out"
        style={{ bottom: '-100px', right: '-100px' }}
      />
    </>
  );
}
