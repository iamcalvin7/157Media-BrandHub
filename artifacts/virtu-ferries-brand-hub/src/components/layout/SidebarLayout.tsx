import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, BookOpen, Image as ImageIcon, Share2, Lightbulb, 
  Archive, FileClock, Menu, X, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/brand-identity", label: "Brand Identity", icon: BookOpen },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  { href: "/social-media", label: "Social Media", icon: Share2 },
  { href: "/social-media-expert", label: "Social Expert", icon: Sparkles },
  { href: "/content-ideas", label: "Content Ideas", icon: Lightbulb },
  { href: "/resources", label: "Resources", icon: Archive },
  { href: "/changelog", label: "Knowledge Changelog", icon: FileClock },
];

function SidebarContent({ location }: { location: string }) {
  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-white/5">
      <div className="px-5 pt-6 pb-4">
        <img
          src="/logo.png"
          alt="Virtu Ferries"
          className="h-14 w-auto object-contain"
          draggable={false}
        />
        <p className="text-[10px] text-white/40 tracking-widest uppercase mt-2 ml-0.5">Brand Hub</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
                  isActive 
                    ? "bg-[#1e82b4]/10 text-[#1e82b4]" 
                    : "text-white/70 hover:text-[#f6a610] hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-[#1e82b4]" : "text-white/40 group-hover:text-[#f6a610]")} />
                <span className="font-medium text-sm">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-[#1e82b4] flex items-center justify-center text-white font-bold text-xs">
            VF
          </div>
          <div>
            <p className="text-sm font-medium text-white">Brand Team</p>
            <p className="text-xs text-white/50">Internal Access</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex overflow-hidden selection:bg-[#1e82b4] selection:text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">
        <SidebarContent location={location} />
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0d0d0d] border-b border-white/5 flex items-center justify-between px-4 z-50">
        <img src="/logo.png" alt="Virtu Ferries" className="h-10 w-auto object-contain" draggable={false} />
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)}>
          <Menu className="w-6 h-6 text-white" />
        </Button>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-64 bg-[#0d0d0d] z-50 shadow-2xl"
            >
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 text-white/50 hover:text-white"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <SidebarContent location={location} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 w-full min-w-0 h-screen overflow-y-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
