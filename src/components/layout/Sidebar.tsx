"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { name: "Projects", href: "/projects", icon: "folder_shared" },
    { name: "Reports", href: "/reports", icon: "analytics" },
    { name: "Marketplace", href: "/marketplace", icon: "storefront" },
  ];

  return (
    <nav className="hidden md:flex flex-col h-screen py-gutter-desktop w-72 left-0 top-0 bg-surface-container-low shadow-2xl z-40 relative flex-shrink-0">
      {/* Header */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <img
          alt="PaperWorking Logo"
          className="w-10 h-10 object-contain"
          src="https://lh3.googleusercontent.com/aida/ADBb0ujudTitz8Bv66g6ir0MNl5p-kxIGB0rCFNG0a0Yv1hJGTm832QinDG-7KIjy_4vpVRrRDGEICYXp2lV-NmXet5QQMVQodBy5C41w9OSjiJXbfgySZXBESLgk_4qqRm_4N3i5OyFpwiGvnzE0nSXWJ6MTCgX1O9v1IARTpJODZbpiLqaY1PDzoU9sHdrKKJCR-uBvFejraSGiK9jx1O_odjqRi5Dp3UkDNNUY6OihAK4mmO_oaHjfYuYuG9I"
        />
        <div>
          <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
            PaperWorking
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Real Estate Portfolio
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 mx-2 my-1 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container border-l-4 border-primary opacity-80"
                  : "text-on-surface-variant hover:bg-white/5 hover:bg-white/10"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-label-md text-label-md">{item.name}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className="flex items-center gap-3 text-on-surface-variant hover:bg-white/5 mx-2 my-1 px-4 py-3 rounded-lg transition-all duration-200 mt-auto"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-md text-label-md">Settings</span>
        </Link>
      </div>

      {/* Footer Meta */}
      <div className="px-6 mt-4">
        <p className="font-label-sm text-label-sm text-on-surface-variant/50">
          v2.4.0
        </p>
      </div>
    </nav>
  );
}
