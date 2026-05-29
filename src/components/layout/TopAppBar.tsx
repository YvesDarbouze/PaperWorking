"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";

export function TopAppBar() {
  const { user, profile } = useAuth();

  return (
    <header className="w-full h-16 bg-surface/60 dark:bg-surface/60 backdrop-blur-lg border-b border-white/10 flex justify-between items-center px-gutter-desktop z-40 flex-shrink-0">
      <div className="flex items-center gap-3 md:hidden mr-4">
        <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center luminous-accent">
          <span className="material-symbols-outlined text-on-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
        </div>
      </div>

      <div className="flex-1 max-w-xl hidden md:block">
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-on-surface-variant" 
            placeholder="Search across portfolio and assets..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 ml-auto">
        <div className="flex items-center gap-4">
          <button className="md:hidden text-on-surface-variant hover:text-primary transition-opacity">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-opacity relative">
            notifications
            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-primary rounded-full"></span>
          </button>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-opacity hidden md:block">help</button>
        </div>
        <div className="h-8 w-px bg-white/10 hidden md:block"></div>
        <div className="flex items-center gap-3 cursor-pointer group">
          {user?.photoURL ? (
            <img 
              alt="User Profile" 
              className="w-10 h-10 rounded-full border-2 border-primary/30 group-hover:border-primary transition-colors object-cover" 
              src={user.photoURL}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm border-2 border-primary/30 group-hover:border-primary transition-colors">
              {profile?.displayName ? profile.displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : "U")}
            </div>
          )}
          <div className="hidden lg:block text-right">
            <p className="font-label-md text-label-md text-on-surface">{profile?.displayName || user?.displayName || "User"}</p>
            <p className="font-label-sm text-[10px] text-primary uppercase tracking-widest">{profile?.role || "Member"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

