import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, BookOpen, Image as ImageIcon, Share2, Lightbulb,
  Archive, Settings, Menu, X, Sparkles, CalendarDays, Milestone,
  BadgePercent, RefreshCw, CalendarCheck, PenLine, ChevronDown, Layers, Star, Bookmark, Camera, Ship, ArrowLeftRight,
  Brain, History, Globe, Wifi, Map as MapIcon, ShieldCheck, CalendarRange, SkipForward,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

type NavItem = { href: string; label: string; icon: React.ElementType };
type NavGroup = { group: string; icon: React.ElementType; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "group" in entry;
}

function buildNav(activeBrandSlug: string | undefined): NavEntry[] {
  return [
  { href: "/dashboard", label: "Home", icon: Home },
  {
    group: "Brand",
    icon: Layers,
    children: [
      { href: "/brand-identity", label: "Brand Identity", icon: BookOpen },
      { href: "/brand-history", label: "Brand History", icon: Milestone },
      { href: "/unique-selling-points", label: "Selling Points", icon: Star },
      { href: "/travel-info", label: "Travel Info", icon: Ship },
      { href: "/schedule-fares", label: "Schedule & Fares", icon: CalendarRange },
      { href: "/onboard-experience", label: "Onboard Experience", icon: Wifi },
      ...(activeBrandSlug === "virtu-ferries"
        ? [
            { href: "/excursions", label: "Excursions", icon: MapIcon },
            { href: "/customer-promise", label: "Customer Promise", icon: ShieldCheck },
          ]
        : []),
    ],
  },
  { href: "/offers", label: "Offers", icon: BadgePercent },
  {
    group: "Assets",
    icon: ImageIcon,
    children: [
      { href: "/assets", label: "Brand Assets", icon: ImageIcon },
      { href: "/media-library", label: "Media Library", icon: Camera },
    ],
  },
  {
    group: "Social Media",
    icon: Share2,
    children: [
      { href: "/social-media", label: "Strategy", icon: Share2 },
      { href: "/content-calendar", label: "Content Calendar", icon: CalendarDays },
      { href: "/skipped-posts", label: "Skipped Posts", icon: SkipForward },
    ],
  },
  { href: "/events", label: "Events & Moments", icon: CalendarCheck },
  { href: "/saved", label: "Saved for Later", icon: Bookmark },
  ...(activeBrandSlug === "virtu-ferries"
    ? [{ href: "/nico", label: "Nico", icon: Camera }]
    : []),
  { href: "/resources", label: "Resources", icon: Archive },
  {
    group: "Agent Knowledge",
    icon: Brain,
    children: [
      { href: "/knowledge-base", label: "Knowledge Base", icon: Brain },
      { href: "/scraper", label: "Site Scraper", icon: Globe },
      { href: "/changelog", label: "Changelog", icon: History },
    ],
  },
  {
    group: "Settings",
    icon: Settings,
    children: [
      { href: "/settings", label: "General", icon: Settings },
      { href: "/settings-pillars", label: "Pillars", icon: Layers },
    ],
  },
  ];
}

// True when the sidebar item should be highlighted for the current URL.
function matchesItem(itemHref: string, location: string): boolean {
  return itemHref === location;
}

function NavLink({ item, location }: { item: NavItem; location: string }) {
  const isActive = matchesItem(item.href, location);
  return (
    <Link href={item.href}>
      <div
        tabIndex={0}
        role="link"
        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0",
          isActive
            ? "bg-[#39A15F]/15 text-[#39A15F]"
            : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5"
        )}
      >
        <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-[#39A15F]" : "text-[#71717A] group-hover:text-[#FAFAFA]")} />
        <span className="font-medium text-sm">{item.label}</span>
      </div>
    </Link>
  );
}

function NavFolder({ group, location }: { group: NavGroup; location: string }) {
  const isChildActive = group.children.some(c => matchesItem(c.href, location));
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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0",
          isChildActive ? "text-[#39A15F]" : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5"
        )}
      >
        <group.icon className={cn("w-5 h-5 shrink-0", isChildActive ? "text-[#39A15F]" : "text-[#71717A] group-hover:text-[#FAFAFA]")} />
        <span className="font-medium text-sm flex-1 text-left">{group.group}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "",
            isChildActive ? "text-[#39A15F]" : "text-[#52525B] group-hover:text-[#FAFAFA]"
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
            <div className="ml-4 pl-3 border-l border-[#262626] mt-0.5 space-y-0.5 pb-1">
              {group.children.map(child => {
                const isActive = location === child.href;
                return (
                  <Link key={child.href} href={child.href}>
                    <div
                      tabIndex={0}
                      role="link"
                      data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0",
                        isActive
                          ? "bg-[#39A15F]/15 text-[#39A15F]"
                          : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5"
                      )}
                    >
                      <child.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-[#39A15F]" : "text-[#71717A] group-hover:text-[#FAFAFA]")} />
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
  const { activeBrand, setActiveBrandSlug } = useBrand();
  const [, navigate] = useLocation();

  // Brand id 1 keeps the original Virtu logo. Other brands fall back to a
  // colored initials chip until they upload their own logo asset.
  const showVirtuLogo = activeBrand?.slug === "virtu-ferries";
  const initials = activeBrand
    ? activeBrand.shortName.slice(0, 2).toUpperCase()
    : "??";
  const primary = activeBrand?.primaryColor ?? "#1e82b4";

  function handleSwitchBrand() {
    setActiveBrandSlug(null);
    navigate("/");
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-r border-[#1F1F1F]">
      <div className="px-5 pt-6 pb-4">
        {showVirtuLogo ? (
          <div className="rounded-2xl bg-white/95 inline-block px-3 py-2">
            <img src="/logo.png" alt={activeBrand?.name ?? "Virtu Ferries"} className="h-10 w-auto object-contain" draggable={false} />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-base"
              style={{ background: primary }}
            >
              {initials}
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-[#FAFAFA] text-sm">{activeBrand?.name ?? "—"}</p>
              {activeBrand?.tagline && (
                <p className="text-[11px] text-[#71717A]">{activeBrand.tagline}</p>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mt-3 ml-0.5">
          <p className="text-[10px] text-[#A1A1AA] tracking-widest uppercase">Brand Hub</p>
          <button
            onClick={handleSwitchBrand}
            data-testid="sidebar-switch-brand"
            className="flex items-center gap-1 text-[10px] text-[#A1A1AA] hover:text-[#39A15F] transition-colors uppercase tracking-wider"
          >
            <ArrowLeftRight className="w-3 h-3" />
            Switch
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {buildNav(activeBrand?.slug).map((entry) =>
          isGroup(entry)
            ? <NavFolder key={entry.group} group={entry} location={location} />
            : <NavLink key={entry.href} item={entry} location={location} />
        )}
      </nav>

      <div className="p-4 border-t border-[#1F1F1F]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-[#141414] border border-[#262626]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
            style={{ background: primary }}
          >
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-[#FAFAFA]">{activeBrand?.shortName ?? "Brand"} Team</p>
            <p className="text-xs text-[#71717A]">Internal Access</p>
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex overflow-hidden">
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent location={location} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0A0A0A] border-b border-[#1F1F1F] flex items-center justify-between px-4 z-50">
        <div className="rounded-xl bg-white/95 inline-block px-2 py-1">
          <img src="/logo.png" alt="Virtu Ferries" className="h-8 w-auto object-contain" draggable={false} />
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
          <Menu className="w-6 h-6 text-[#FAFAFA]" />
        </Button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-64 bg-[#0A0A0A] z-50 shadow-2xl"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/5"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <SidebarContent location={location} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 w-full min-w-0 h-screen overflow-y-auto overflow-x-hidden pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
