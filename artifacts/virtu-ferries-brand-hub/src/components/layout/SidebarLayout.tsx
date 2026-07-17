import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Home, BookOpen, Image as ImageIcon, Share2, Lightbulb,
  Archive, Settings, Menu, X, Sparkles, CalendarDays, Milestone,
  BadgePercent, RefreshCw, CalendarCheck, PenLine, ChevronDown, Layers, Star, Bookmark, Camera, Ship, ArrowLeftRight,
  Brain, History, Globe, Wifi, Map as MapIcon, MapPin, ShieldCheck, CalendarRange, SkipForward, Bus, FileText, Printer, Ruler, Repeat2, Users, BarChart2,
} from "lucide-react";
import { FeedbackBell } from "./FeedbackBell";
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
      ...(activeBrandSlug === "gozo-highspeed"
        ? [
            { href: "/hop-on-hop-off", label: "Hop-On Hop-Off", icon: Bus },
            { href: "/ghs-resources", label: "Resources", icon: Globe },
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
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/ad-specs", label: "Ad Specs", icon: Ruler },
      { href: "/design-brief", label: "Design Brief", icon: PenLine },
      { href: "/prints", label: "Print", icon: Printer },
      { href: "/resources", label: "Library", icon: Archive },
    ],
  },
  {
    group: "Social Media",
    icon: Share2,
    children: [
      { href: "/social-media", label: "Strategy", icon: Share2 },
      { href: "/saved", label: "Ideas", icon: Bookmark },
      { href: "/content-calendar", label: "Content Calendar", icon: CalendarDays },
      { href: "/skipped-posts", label: "Skipped Posts", icon: SkipForward },
      ...(activeBrandSlug === "virtu-ferries"
        ? [
            { href: "/reposts", label: "Reposts (UGC)", icon: Repeat2 },
            { href: "/performance-reports", label: "Performance Reports", icon: BarChart2 },
          ]
        : []),
    ],
  },
  { href: "/events", label: "Events & Moments", icon: CalendarCheck },
  ...(activeBrandSlug === "virtu-ferries"
    ? [{ href: "/destination-resources", label: "Destination Resources", icon: MapPin }]
    : []),
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
      { href: "/people", label: "People", icon: Users },
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
          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 group",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0",
          isActive
            ? "nav-active-rail bg-[#39A15F]/[0.08] text-[#FAFAFA]"
            : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.03]"
        )}
      >
        <item.icon className={cn("w-[17px] h-[17px] shrink-0 transition-colors", isActive ? "text-[#39A15F]" : "text-[#8E8E96] group-hover:text-[#A1A1AA]")} />
        <span className={cn("text-[13px] tracking-[-0.005em]", isActive ? "font-semibold" : "font-medium")}>{item.label}</span>
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
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0",
          isChildActive ? "text-[#FAFAFA]" : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.03]"
        )}
      >
        <group.icon className={cn("w-[17px] h-[17px] shrink-0 transition-colors", isChildActive ? "text-[#39A15F]" : "text-[#8E8E96] group-hover:text-[#A1A1AA]")} />
        <span className={cn("text-[13px] flex-1 text-left tracking-[-0.005em]", isChildActive ? "font-semibold" : "font-medium")}>{group.group}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-180" : "",
            isChildActive ? "text-[#39A15F]" : "text-[#6B6B73] group-hover:text-[#A1A1AA]"
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
            <div className="ml-[18px] pl-3 border-l border-[#222222] mt-0.5 space-y-0.5 pb-1">
              {group.children.map(child => {
                const isActive = location === child.href;
                return (
                  <Link key={child.href} href={child.href}>
                    <div
                      tabIndex={0}
                      role="link"
                      data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-1.5 rounded-md cursor-pointer transition-all duration-200 group",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0",
                        isActive
                          ? "bg-[#39A15F]/[0.10] text-[#FAFAFA]"
                          : "text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.03]"
                      )}
                    >
                      <child.icon className={cn("w-[14px] h-[14px] shrink-0 transition-colors", isActive ? "text-[#39A15F]" : "text-[#6B6B73] group-hover:text-[#A1A1AA]")} />
                      <span className={cn("text-[12.5px] tracking-[-0.005em]", isActive ? "font-semibold" : "font-medium")}>{child.label}</span>
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

  const showVirtuLogo = activeBrand?.slug === "virtu-ferries";
  const showGHSLogo = activeBrand?.slug === "gozo-highspeed";
  const initials = activeBrand
    ? activeBrand.shortName.slice(0, 2).toUpperCase()
    : "??";
  const primary = activeBrand?.primaryColor ?? "#1e82b4";

  function handleSwitchBrand() {
    setActiveBrandSlug(null);
    navigate("/");
  }

  return (
    <div className="flex flex-col h-full bg-[#0E0E0E] border-r border-[#1A1A1A]">
      {/* Brand block */}
      <div className="border-b border-[#1A1A1A]">
        {/* Full-width logo banner */}
        <div
          className="w-full h-[90px] flex items-center justify-center px-5"
          style={{ background: "#ffffff" }}
        >
          {showVirtuLogo ? (
            <img src="/logo.png" alt={activeBrand?.name ?? "Virtu Ferries"} className="max-h-[52px] w-auto object-contain" draggable={false} />
          ) : showGHSLogo ? (
            <img src="/gozo-highspeed-logo.png" alt={activeBrand?.name ?? "Gozo Highspeed"} className="max-h-[52px] w-auto object-contain" draggable={false} />
          ) : (
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-sm ring-1 ring-white/10"
              style={{ background: `linear-gradient(135deg, ${activeBrand?.primaryColor ?? primary}, ${activeBrand?.accentColor ?? primary})` }}
            >
              {initials}
            </div>
          )}
        </div>
        {/* Switch row */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#6B6B73]">
            <span className="h-1 w-1 rounded-full bg-[#39A15F] shadow-[0_0_6px_rgba(57,161,95,0.8)]" />
            Brand Hub
          </span>
          <div className="flex items-center gap-2">
            <FeedbackBell />
            <button
              onClick={handleSwitchBrand}
              data-testid="sidebar-switch-brand"
              className="flex items-center gap-1 text-[9px] text-[#6B6B73] hover:text-[#39A15F] transition-colors uppercase tracking-[0.22em] font-semibold"
            >
              <ArrowLeftRight className="w-2.5 h-2.5" />
              Switch
            </button>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {buildNav(activeBrand?.slug).map((entry) =>
          isGroup(entry)
            ? <NavFolder key={entry.group} group={entry} location={location} />
            : <NavLink key={entry.href} item={entry} location={location} />
        )}
      </nav>

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
    <div className="min-h-screen bg-[#F5F5F5] text-[#18181B] flex overflow-hidden">
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent location={location} />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0E0E0E] border-b border-[#1A1A1A] flex items-center justify-between px-4 z-50">
        <div className="rounded-xl bg-white/95 inline-block px-2 py-1">
          <img src="/logo.png" alt="Virtu Ferries" className="h-8 w-auto object-contain" draggable={false} />
        </div>
        <div className="flex items-center gap-1">
          <FeedbackBell compact />
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
            <Menu className="w-6 h-6 text-[#FAFAFA]" />
          </Button>
        </div>
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
              className="md:hidden fixed top-0 bottom-0 left-0 w-64 bg-[#121212] z-50 shadow-2xl"
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
