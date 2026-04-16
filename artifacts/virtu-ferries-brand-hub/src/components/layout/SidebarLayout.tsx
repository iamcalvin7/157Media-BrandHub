import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, BookOpen, Image as ImageIcon, Share2, Lightbulb,
  Archive, Settings, Menu, X, Sparkles, CalendarDays, Milestone,
  BadgePercent, RefreshCw, CalendarCheck, PenLine, ChevronDown, Layers, Library, ScrollText, Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { group: string; icon: React.ElementType; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "group" in entry;
}

const NAV: NavEntry[] = [
  { href: "/", label: "Home", icon: Home },
  {
    group: "Brand",
    icon: Layers,
    children: [
      { href: "/brand-identity", label: "Brand Identity", icon: BookOpen },
      { href: "/brand-history", label: "Brand History", icon: Milestone },
      { href: "/unique-selling-points", label: "Selling Points", icon: Star },
    ],
  },
  { href: "/offers", label: "Offers", icon: BadgePercent },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  {
    group: "Social Media",
    icon: Share2,
    children: [
      { href: "/social-media", label: "Strategy", icon: Share2 },
      { href: "/social-media-expert", label: "Social Expert", icon: Sparkles },
      { href: "/content-ideas", label: "Content Ideas", icon: Lightbulb },
    ],
  },
  { href: "/monthly-planning", label: "Monthly Planning", icon: RefreshCw },
  { href: "/content-calendar", label: "Content Calendar", icon: CalendarDays },
  {
    group: "Copywriter",
    icon: PenLine,
    children: [
      { href: "/copywriter", label: "Write", icon: PenLine },
      { href: "/copywriter-library", label: "Library", icon: Library },
      { href: "/copywriter-rules", label: "Rules", icon: ScrollText },
    ],
  },
  { href: "/events", label: "Events & Moments", icon: CalendarCheck },
  { href: "/resources", label: "Resources", icon: Archive },
  {
    group: "Settings",
    icon: Settings,
    children: [
      { href: "/settings", label: "General", icon: Settings },
      { href: "/settings-pillars", label: "Pillars", icon: Layers },
    ],
  },
];

function NavLink({ item, location }: { item: NavItem; location: string }) {
  const isActive = location === item.href;
  return (
    <Link href={item.href}>
      <div
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
          isActive
            ? "bg-[#1e82b4]/10 text-[#1e82b4]"
            : "text-gray-600 hover:text-[#f6a610] hover:bg-gray-100"
        )}
      >
        <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-[#1e82b4]" : "text-gray-400 group-hover:text-[#f6a610]")} />
        <span className="font-medium text-sm">{item.label}</span>
      </div>
    </Link>
  );
}

function NavFolder({ group, location }: { group: NavGroup; location: string }) {
  const isChildActive = group.children.some(c => c.href === location);
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => {
    if (isChildActive) setOpen(true);
  }, [isChildActive]);

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
          isChildActive ? "text-[#1e82b4]" : "text-gray-600 hover:text-[#f6a610] hover:bg-gray-100"
        )}
      >
        <group.icon className={cn("w-5 h-5 shrink-0", isChildActive ? "text-[#1e82b4]" : "text-gray-400 group-hover:text-[#f6a610]")} />
        <span className="font-medium text-sm flex-1 text-left">{group.group}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "",
            isChildActive ? "text-[#1e82b4]" : "text-gray-300 group-hover:text-[#f6a610]"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="ml-4 pl-3 border-l border-gray-200 mt-0.5 space-y-0.5 pb-1">
              {group.children.map(child => {
                const isActive = location === child.href;
                return (
                  <Link key={child.href} href={child.href}>
                    <div
                      data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group",
                        isActive
                          ? "bg-[#1e82b4]/10 text-[#1e82b4]"
                          : "text-gray-500 hover:text-[#f6a610] hover:bg-gray-100"
                      )}
                    >
                      <child.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#1e82b4]" : "text-gray-400 group-hover:text-[#f6a610]")} />
                      <span className="font-medium text-sm">{child.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarContent({ location }: { location: string }) {
  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-100">
      <div className="px-5 pt-6 pb-4">
        <img src="/logo.png" alt="Virtu Ferries" className="h-14 w-auto object-contain" draggable={false} />
        <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-2 ml-0.5">Brand Hub</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map((entry, i) =>
          isGroup(entry)
            ? <NavFolder key={entry.group} group={entry} location={location} />
            : <NavLink key={entry.href} item={entry} location={location} />
        )}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-100 border border-gray-200">
          <div className="w-8 h-8 rounded-full bg-[#1e82b4] flex items-center justify-center text-white font-bold text-xs">
            VF
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Brand Team</p>
            <p className="text-xs text-gray-400">Internal Access</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex overflow-hidden selection:bg-[#1e82b4] selection:text-white">
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent location={location} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-gray-50 border-b border-gray-100 flex items-center justify-between px-4 z-50">
        <img src="/logo.png" alt="Virtu Ferries" className="h-10 w-auto object-contain" draggable={false} />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
          <Menu className="w-6 h-6 text-gray-900" />
        </Button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-64 bg-gray-50 z-50 shadow-2xl"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <SidebarContent location={location} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full min-w-0 h-screen overflow-y-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
