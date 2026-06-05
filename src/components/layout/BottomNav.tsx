"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";
import toast from "react-hot-toast";

export function BottomNav() {
  const pathname = usePathname();
  const { unreadTotal } = useNotification();

  const handleNavClick = (e: React.MouseEvent, itemHref: string, itemName: string) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/demo')) {
      if (itemHref === '/dashboard/command-center' || itemName === 'Portfolio') {
        e.preventDefault();
        window.location.href = '/demo';
        return;
      }
      e.preventDefault();
      toast.error(`Demo Mode: Sign up to access ${itemName} features.`, {
        id: 'demo-bottom-guard',
        style: { background: '#111', color: '#fff', border: '1px solid #333' }
      });
    }
  };

  const navItems = [
    { name: "Portfolio", href: "/dashboard/command-center", icon: "folder_shared" },
    { name: "Projects", href: "/dashboard/projects", icon: "assignment" },
    { name: "Analyze", href: "/dashboard/deal-analyzer", icon: "analytics" },
    { name: "Inbox", href: "/dashboard/inbox", icon: "inbox" },
    { name: "Reports", href: "/dashboard/reports", icon: "assessment" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-2 pb-safe"
      style={{
        height: '72px',
        background: 'rgba(11,20,26,0.92)',
        backdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px 16px 0 0',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href) || (item.href === "/dashboard/command-center" && pathname === "/dashboard");
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={(e) => handleNavClick(e, item.href, item.name)}
            className="flex flex-col items-center justify-center relative py-2 px-3 transition-all duration-200"
            style={{
              color: isActive ? 'var(--color-primary)' : 'rgba(218,228,236,0.4)',
              transform: isActive ? 'scale(0.95)' : 'scale(1)',
            }}
          >
            <div className="relative">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              {item.name === "Inbox" && unreadTotal > 0 && (
                <span
                  className="absolute -top-1 -right-2 text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                  style={{
                    background: 'var(--color-primary)',
                    color: '#091015',
                    boxShadow: '0 0 6px rgba(32, 178, 170,0.5)',
                  }}
                >
                  {unreadTotal > 9 ? '9+' : unreadTotal}
                </span>
              )}
            </div>
            <span
              className="mt-1 uppercase tracking-tight"
              style={{
                fontSize: '9px',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '0.02em',
              }}
            >
              {item.name}
            </span>
            {/* Luminous dot indicator */}
            {isActive && (
              <div
                className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                style={{
                  background: 'var(--color-primary)',
                  boxShadow: '0 0 10px 2px rgba(32, 178, 170,0.5)',
                }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
