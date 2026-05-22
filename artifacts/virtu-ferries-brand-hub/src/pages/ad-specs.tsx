import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Ruler, Monitor, Smartphone, Globe, Newspaper, FileImage } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { AdPublication } from "@/lib/brand-content";

// ─── Constants ────────────────────────────────────────────────────────────────

const card = "bg-[#FFFFFF] border border-[#F4F4F5] rounded-xl";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render a tiny aspect-ratio preview bar, max dimension = 36px */
function AspectBar({ width, height }: { width: number; height: number }) {
  const MAX = 36;
  const ratio = width / height;
  let w: number, h: number;
  if (ratio >= 1) {
    w = MAX;
    h = Math.round(MAX / ratio);
  } else {
    h = MAX;
    w = Math.round(MAX * ratio);
  }
  // clamp min dimension so hairlines don't disappear
  w = Math.max(w, 2);
  h = Math.max(h, 2);

  return (
    <div
      className="shrink-0 rounded-sm border border-[#E4E4E7] bg-[var(--brand-primary)]/10"
      style={{ width: w, height: h }}
      title={`${width}×${height}`}
    />
  );
}

function formatBytes(kb: number): string {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

// Map publication IDs to icons
const PUB_ICONS: Record<string, LucideIcon> = {
  newsbook: Newspaper,
  one: Monitor,
  "times-pbs": Globe,
  "virtu-website": FileImage,
};

// ─── Section heading ──────────────────────────────────────────────────────────

type SectionDef = { id: string; num: string; name: string; Icon: LucideIcon };

function SectionHead({ id, num, name, Icon }: SectionDef) {
  return (
    <header className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-medium tracking-[0.18em] text-[#A1A1AA] num-tabular">{num}</span>
      <span className="h-px w-6 bg-[#E4E4E7]" />
      <Icon className="w-3 h-3 text-[#A1A1AA]" />
      <h2 className="text-[13px] font-medium text-[#27272A] tracking-[-0.005em]">{name}</h2>
      <span className="sr-only" id={id} />
    </header>
  );
}

// ─── Publication Card ─────────────────────────────────────────────────────────

function PublicationSection({ pub, sectionDef }: { pub: AdPublication; sectionDef: SectionDef }) {
  return (
    <section id={pub.id}>
      <SectionHead {...sectionDef} />

      {pub.globalMaxFileSizeKb && (
        <div className="mb-3 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 w-fit">
          <Smartphone className="w-3 h-3 shrink-0" />
          Max file size: {formatBytes(pub.globalMaxFileSizeKb)} per creative
        </div>
      )}

      {pub.notes && (
        <p className="mb-3 text-[11px] text-[#71717A] font-light">{pub.notes}</p>
      )}

      <div className={`${card} overflow-hidden`}>
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 border-b border-[#F4F4F5] bg-[#F5F5F5]">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium">Format</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium text-right">Dimensions</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium text-right w-9">Shape</span>
        </div>

        {/* Format rows */}
        <div className="divide-y divide-[#FAFAFA]">
          {pub.formats.map((fmt) => (
            <div
              key={`${fmt.width}x${fmt.height}-${fmt.name}`}
              className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-[#FAFAFA] transition-colors"
            >
              <div>
                <p className="text-[12px] font-medium text-[#27272A]">{fmt.name}</p>
                {fmt.notes && (
                  <p className="text-[10px] text-[#A1A1AA] font-light mt-0.5">{fmt.notes}</p>
                )}
                {fmt.maxFileSizeKb && (
                  <span className="inline-block mt-0.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-1.5 py-0.5">
                    Max {formatBytes(fmt.maxFileSizeKb)}
                  </span>
                )}
              </div>

              <div className="text-right">
                <span className="text-[13px] font-semibold text-[#18181B] num-tabular tracking-[-0.01em]">
                  {fmt.width} × {fmt.height}
                </span>
                <span className="text-[10px] text-[#A1A1AA] ml-1">px</span>
              </div>

              <div className="flex items-center justify-end w-9">
                <AspectBar width={fmt.width} height={fmt.height} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdSpecs() {
  const content = useBrandContent();
  const adSpecs = content.adSpecs;
  const publications = adSpecs?.publications ?? [];

  const totalFormats = publications.reduce((acc, p) => acc + p.formats.length, 0);

  // Build section list
  const sections: SectionDef[] = publications.map((pub, i) => ({
    id: pub.id,
    num: String(i + 1).padStart(2, "0"),
    name: pub.name,
    Icon: PUB_ICONS[pub.id] ?? Ruler,
  }));

  // Active section tracking
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections.length]);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] text-[#18181B]">
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative px-6 md:px-10 py-10 md:py-12 max-w-4xl mx-auto pb-24"
      >
        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#A1A1AA]">
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--brand-primary)" }} />
            Asset Dimensions
          </div>
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#18181B]">
            Ad Specs
          </h1>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">
            Pixel dimensions and file size limits for every publication and placement. Reference before resizing creative.
          </p>

          {publications.length > 0 && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-semibold text-[#18181B] num-tabular tracking-[-0.01em]">{publications.length}</span>
                <span className="text-[11px] text-[#71717A] font-light">{publications.length === 1 ? "publication" : "publications"}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-semibold text-[#18181B] num-tabular tracking-[-0.01em]">{totalFormats}</span>
                <span className="text-[11px] text-[#71717A] font-light">{totalFormats === 1 ? "format" : "formats"}</span>
              </div>
            </div>
          )}
        </header>

        {/* ─── Sticky section nav ───────────────────────────────────── */}
        {sections.length > 1 && (
          <nav className="sticky top-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-3 mb-10 bg-[#F5F5F5]/80 backdrop-blur-md border-b border-[#FAFAFA]">
            <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {sections.map((s) => {
                const active = activeId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium tracking-[-0.005em] transition-colors whitespace-nowrap ${
                        active
                          ? "text-[#18181B] bg-[#FFFFFF] border border-[#E4E4E7]"
                          : "text-[#71717A] hover:text-[#27272A] border border-transparent"
                      }`}
                    >
                      <span className={`text-[10px] num-tabular ${active ? "text-[var(--brand-primary)]" : "text-[#3F3F46]"}`}>
                        {s.num}
                      </span>
                      {s.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* ─── Content ──────────────────────────────────────────────── */}
        {publications.length === 0 ? (
          <div className={`${card} p-6`}>
            <EmptySection
              title="No ad specs configured yet"
              message="Add publication formats (name, width, height, file size) to this brand and they will appear here."
            />
          </div>
        ) : (
          <div className="space-y-14">
            {publications.map((pub, i) => (
              <div key={pub.id} ref={(el) => { sectionRefs.current[pub.id] = el; }}>
                <PublicationSection
                  pub={pub}
                  sectionDef={sections[i]}
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
