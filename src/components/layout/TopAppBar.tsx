"use client";

import React from "react";

export function TopAppBar() {
  return (
    <header className="flex justify-between items-center w-full px-gutter-desktop h-16 bg-surface/80 backdrop-blur-xl shadow-sm z-30 flex-shrink-0">
      <div className="flex items-center gap-3 md:hidden">
        <img
          alt="PaperWorking Logo"
          className="w-8 h-8 object-contain"
          src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
        />
        <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
          PaperWorking
        </span>
      </div>

      {/* Global Search (Desktop Focus) */}
      <div className="hidden md:flex flex-1 max-w-md mx-8">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            search
          </span>
          <input
            className="w-full bg-surface-container-high border border-outline-variant/50 rounded-full py-2 pl-10 pr-4 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant/50"
            placeholder="Search projects, addresses, documents..."
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <button className="md:hidden text-on-surface-variant">
          <span className="material-symbols-outlined">search</span>
        </button>
        <button className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-label-md text-label-md hover:bg-primary/20 transition-colors border border-primary/20">
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">Create Project</span>
        </button>
        <div className="w-8 h-8 rounded-lg border border-primary/20 bg-surface-container overflow-hidden hidden md:block">
          <img
            alt="Profile"
            className="w-full h-full object-cover grayscale contrast-125"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvmn3X6gqmme_cOLErZxrY_quCkV09dI5tBh1tNia7t1TLxu1zGksP533i940kxiwTf2t7q0hUOOjxkbNFQfc-b4u1h2-qqC_0jDV-8MG7FAKjSARSibWywnupzrDeUF2XT_VxdRLtlRHwuLltavn63_KNxeDPCXcdwAp57ShiH7iTDdvmATXfjCehT6ycplRX5m7mNEj2p9IJwJ36E9T9pSjubkBODvRvw3s_rUrzKO5HwfL_ZfER6BDOD9eKHnKSc4r8ALF5BECO"
          />
        </div>
      </div>
    </header>
  );
}
