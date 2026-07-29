"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  variant?: "default" | "compact";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
}: EmptyStateProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border-accent bg-bg-surface/50 p-6 md:p-10 shadow-inner backdrop-blur-md ${
        isCompact ? "py-6 px-4 min-h-[180px]" : "py-16 px-8 min-h-[280px]"
      }`}
    >
      {icon && (
        <div
          className={`flex items-center justify-center rounded-full bg-bg-primary border border-border-accent text-text-secondary/60 mb-4 ${
            isCompact ? "w-10 h-10 p-2" : "w-16 h-16 p-4"
          }`}
        >
          {icon}
        </div>
      )}
      <h3
        className={`font-black uppercase tracking-widest text-text-primary ${
          isCompact ? "text-xs mb-1" : "text-sm mb-2"
        }`}
      >
        {title}
      </h3>
      <p
        className={`text-text-secondary max-w-sm leading-relaxed uppercase tracking-tight font-medium ${
          isCompact ? "text-[10px]" : "text-xs"
        }`}
      >
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className={`mt-5 font-black uppercase tracking-widest border border-pw-border bg-pw-black text-pw-white hover:bg-pw-accent hover:border-pw-accent transition-all ${
            isCompact ? "px-4 py-2 text-[10px]" : "px-6 py-3 text-xs"
          }`}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
