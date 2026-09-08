'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '@/lib/a11y/useReducedMotion';

export interface CountUpNumberProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUpNumber({
  value,
  duration = 500,
  formatter,
  prefix = '',
  suffix = '',
  className = '',
}: CountUpNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const isServer = typeof window === 'undefined';
  const [displayValue, setDisplayValue] = useState(() => (isServer || prefersReducedMotion ? value : 0));
  const hasAnimated = useRef(false);

  useEffect(() => {
    // If reduced motion is requested, render the exact final value immediately
    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    if (hasAnimated.current) {
      setDisplayValue(value);
      return;
    }

    hasAnimated.current = true;
    let startTime: number | null = null;
    let frameId: number;

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic: 1 - (1 - t)^3
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const current = easedProgress * value;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration, prefersReducedMotion]);

  const formatted = formatter
    ? formatter(displayValue)
    : `${prefix}${displayValue.toFixed(1)}${suffix}`;

  return <span className={`tabular-nums ${className}`}>{formatted}</span>;
}
