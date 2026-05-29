"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";

export function BottomNav() {
  const pathname = usePathname();
  const { unreadTotal } = useNotification();

  const navItems = [
    { name: "Portfolio", href: "/dashboard/command-center", icon: "folder_shared" },
    { name: "Projects", href: "/dashboard/projects", icon: "assignment" },
    { name: "Inbox", href: "/dashboard/inbox", icon: "inbox" },
    { name: "Reports", href: "/dashboard/reports", icon: "assessment" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 w-full rounded-t-xl z-50 bg-surface-container-highest/90 backdrop-blur-2xl border-t border-white/5 shadow-lg flex justify-around items-center h-20 px-4 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href) || (item.href === "/dashboard/command-center" && pathname === "/dashboard");
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center relative transition-all ${
              isActive
                ? "text-primary bg-primary/10 rounded-xl px-3 py-1 scale-90 duration-150"
                : "text-on-surface-variant/70 hover:text-primary"
            }`}
          >
            <div className="relative">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              {item.name === "Inbox" && unreadTotal > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary text-on-primary text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </div>
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
