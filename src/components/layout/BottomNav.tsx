"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { name: "Projects", href: "/projects", icon: "folder_shared" },
    { name: "Market", href: "/marketplace", icon: "storefront" },
    { name: "Inbox", href: "/inbox", icon: "mail" },
    { name: "Reports", href: "/reports", icon: "analytics" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full rounded-t-xl z-50 bg-surface-container-highest/90 backdrop-blur-2xl border-t border-white/5 shadow-lg flex justify-around items-center h-20 px-4 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center transition-all ${
              isActive
                ? "text-primary bg-primary/10 rounded-xl px-3 py-1 scale-90 duration-150"
                : "text-on-surface-variant/70 hover:text-primary"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            <span className="font-label-sm text-[10px] mt-1 uppercase tracking-tighter">
              {item.name}
            </span>
            {isActive && (
              <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#2dd4bf]"></div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
