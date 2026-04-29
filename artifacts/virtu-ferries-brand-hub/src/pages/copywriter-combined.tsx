import { useLocation } from "wouter";
import { PenLine, Library, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import Copywriter from "./copywriter";
import CopywriterLibrary from "./copywriter-library";
import CopywriterRules from "./copywriter-rules";

const TABS = [
  { id: "write", label: "Write", path: "/copywriter", icon: PenLine, component: Copywriter },
  { id: "library", label: "Library", path: "/copywriter-library", icon: Library, component: CopywriterLibrary },
  { id: "rules", label: "Rules", path: "/copywriter-rules", icon: ScrollText, component: CopywriterRules },
] as const;

function normalizePath(loc: string): string {
  // Strip query/hash and trailing slash so /copywriter-rules?foo=1 still
  // resolves to the Rules tab instead of falling back to Write.
  const noQuery = loc.split(/[?#]/)[0] ?? loc;
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, "") : noQuery;
}

export default function CopywriterCombined() {
  const [location, setLocation] = useLocation();
  const path = normalizePath(location);
  const active = TABS.find((t) => t.path === path) ?? TABS[0];
  const Active = active.component;

  return (
    <div className="bg-white">
      {/* Sit below the fixed mobile header (h-16) but flush at desktop. */}
      <div className="sticky top-16 md:top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 flex items-end gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.id === active.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setLocation(t.path)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "text-[#1e82b4] border-[#1e82b4]"
                    : "text-gray-400 border-transparent hover:text-gray-700",
                )}
                data-testid={`copywriter-tab-${t.id}`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <Active />
    </div>
  );
}
