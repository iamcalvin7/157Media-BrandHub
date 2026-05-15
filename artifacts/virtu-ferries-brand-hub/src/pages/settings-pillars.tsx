import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Plus, Trash2, GripVertical, Save, Loader2, Check, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PillarRow {
  id?: number;
  name: string;
  market: string;
  sort_order: number;
  active: boolean;
}

const MARKET_OPTIONS = [
  { value: "both", label: "Both markets", color: "bg-[#F4F4F5] text-[#18181B]" },
  { value: "english", label: "English only", color: "bg-[#39A15F]/15 text-[#39A15F]" },
  { value: "italian", label: "Italian only", color: "bg-[#39A15F]/15 text-[#39A15F]" },
];

export default function SettingsPillars() {
  const [pillars, setPillars] = useState<PillarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/content/pillars`)
      .then(r => r.json())
      .then(data => { setPillars(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function addPillar() {
    setPillars(prev => [
      ...prev,
      { name: "", market: "both", sort_order: prev.length, active: true },
    ]);
  }

  function remove(i: number) {
    setPillars(prev => prev.filter((_, j) => j !== i).map((p, j) => ({ ...p, sort_order: j })));
  }

  function update<K extends keyof PillarRow>(i: number, key: K, val: PillarRow[K]) {
    setPillars(prev => prev.map((p, j) => j === i ? { ...p, [key]: val } : p));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setPillars(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next.map((p, j) => ({ ...p, sort_order: j }));
    });
  }

  function moveDown(i: number) {
    setPillars(prev => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next.map((p, j) => ({ ...p, sort_order: j }));
    });
  }

  async function save() {
    if (pillars.some(p => !p.name.trim())) {
      setError("All pillars must have a name.");
      return;
    }
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`${API}/api/content/pillars`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pillars.map((p, i) => ({
          name: p.name.trim(),
          market: p.market,
          sort_order: i,
          active: p.active,
        }))),
      });
      if (!res.ok) throw new Error("Failed to save");
      const updated = await res.json();
      setPillars(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-[#39A15F]" />
              <h1 className="text-2xl font-extrabold text-[#18181B] tracking-tight">Content Pillars</h1>
            </div>
            <p className="text-sm text-[#71717A] font-light">
              Define the pillars used across the Copywriter and Content Calendar. Changes apply everywhere immediately.
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all shrink-0",
              saved ? "bg-[#39A15F] text-black" : "bg-[#39A15F] hover:bg-[#2E8550] text-black"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved" : "Save pillars"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-300 bg-red-950/30 border border-red-900/40 rounded-2xl px-4 py-3">{error}</p>
        )}

        {/* Pillar list */}
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#39A15F] animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {pillars.map((pillar, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className={cn(
                    "bg-[#FAFAFA] border rounded-2xl p-4 flex items-center gap-3 transition-all",
                    pillar.active ? "border-[#E4E4E7]" : "border-[#E4E4E7] opacity-50"
                  )}
                >
                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="p-0.5 text-[#A1A1AA] hover:text-[#18181B] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === pillars.length - 1}
                      className="p-0.5 text-[#A1A1AA] hover:text-[#18181B] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <GripVertical className="w-3.5 h-3.5 text-[#3F3F46] shrink-0" />

                  {/* Name */}
                  <input
                    value={pillar.name}
                    onChange={e => update(i, "name", e.target.value)}
                    placeholder="Pillar name…"
                    className="flex-1 min-w-0 text-sm font-semibold text-[#18181B] bg-transparent border-0 outline-none placeholder:text-[#A1A1AA] placeholder:font-normal"
                  />

                  {/* Market selector */}
                  <div className="flex gap-1 shrink-0">
                    {MARKET_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => update(i, "market", opt.value)}
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all border",
                          pillar.market === opt.value
                            ? opt.color + " border-transparent"
                            : "text-[#A1A1AA] border-[#E4E4E7] hover:border-[#A1A1AA]"
                        )}
                      >
                        {opt.value === "both" ? "Both" : opt.value === "english" ? "🇬🇧 EN" : "🇮🇹 IT"}
                      </button>
                    ))}
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => update(i, "active", !pillar.active)}
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all shrink-0",
                      pillar.active
                        ? "bg-[#39A15F]/15 border-[#39A15F]/40 text-[#39A15F]"
                        : "bg-[#F4F4F5] border-[#E4E4E7] text-[#71717A]"
                    )}
                  >
                    {pillar.active ? "Active" : "Hidden"}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => remove(i)}
                    className="text-[#A1A1AA] hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              onClick={addPillar}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#E4E4E7] rounded-2xl text-sm text-[#71717A] hover:text-[#39A15F] hover:border-[#39A15F]/40 hover:bg-[#39A15F]/5 transition-all font-medium"
            >
              <Plus className="w-4 h-4" />
              Add pillar
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-[#E4E4E7] text-xs text-[#71717A] space-y-1 font-light">
          <p><span className="font-semibold text-[#A1A1AA]">Both</span> — appears in English and Italian market dropdowns</p>
          <p><span className="font-semibold text-[#A1A1AA]">EN / IT</span> — market-specific pillars (e.g. "Choose Sicily" for English, "Choose Malta" for Italian). Strategic pillars (The Virtu Experience, Virtu Recommends, For the Feed) sit on Both.</p>
          <p><span className="font-semibold text-[#A1A1AA]">Hidden</span> — kept in DB but not shown in dropdowns</p>
        </div>

      </div>
    </div>
  );
}
