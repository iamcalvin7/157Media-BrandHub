import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook, Instagram, PenLine, Loader2, Copy, Check,
  RefreshCw, ChevronDown, ChevronUp, Link2, X,
  ThumbsUp, ThumbsDown, BookOpen, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePillars } from "@/hooks/usePillars";
import { useBrandContent } from "@/lib/brand-content";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const POST_TYPES = [
  "Weekly Schedule",
  "Offer / Promotion",
  "Event",
  "Destination Spotlight",
  "Seasonal / Cultural",
  "Behind the Scenes",
  "General",
];
const FORMATS = ["Single Image", "Carousel", "Reel", "Video"];

function CharCount({ text, platform }: { text: string; platform: string }) {
  const len = text.length;
  const target = platform === "Instagram" ? 150 : 280;
  const pct = Math.min(len / target, 1);
  const over = len > target;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", over ? "bg-red-400" : "bg-[#1e82b4]")}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className={cn("text-[10px] font-mono tabular-nums", over ? "text-red-500" : "text-gray-400")}>
        {len} / {target}
      </span>
    </div>
  );
}

export default function Copywriter() {
  const { englishPillars, italianPillars } = usePillars();
  const { copywriter: copywriterContent } = useBrandContent();
  const { activeBrandSlug } = useBrand();
  // GHS uses one unified tone of voice — no platform/market split.
  const isGozo = activeBrandSlug === "gozo-highspeed";
  const [platform, setPlatform] = useState<"Facebook" | "Instagram">("Facebook");
  const [market, setMarket] = useState<"English" | "Italian">("English");
  const [postType, setPostType] = useState("");
  const [pillar, setPillar] = useState("");
  const [format, setFormat] = useState("");
  const [brief, setBrief] = useState("");
  const [toneNotes, setToneNotes] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [exampleCopies, setExampleCopies] = useState<string[]>([]);
  const [draftExample, setDraftExample] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState<string | null>(null);
  const [editedCaption, setEditedCaption] = useState("");
  const [editing, setEditing] = useState(false);

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const outputRef = useRef<HTMLDivElement>(null);
  const pillars = market === "Italian" ? italianPillars : englishPillars;

  async function generate(feedback?: string) {
    setLoading(true);
    setError("");
    setEditing(false);
    setSaved(false);
    setShowRejectForm(false);
    setRejectNote("");
    try {
      const res = await fetch(`${API}/api/content/quick-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform, market,
          brief: brief.trim(),
          pillar: pillar || undefined,
          post_type: postType || undefined,
          format: format || undefined,
          tone_notes: toneNotes.trim() || undefined,
          reference_url: referenceUrl.trim() || undefined,
          example_copies: exampleCopies.filter(Boolean).length ? exampleCopies.filter(Boolean) : undefined,
          feedback: feedback?.trim() || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      const newCaption = data.caption ?? "";
      setCaption(newCaption);
      setEditedCaption(newCaption);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveCaption() {
    if (!editedCaption.trim()) return;
    setSaving(true);
    await Promise.all([
      fetch(`${API}/api/content/past-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          date: new Date().toISOString().split("T")[0],
          platform,
          caption: editedCaption,
          market: market === "Italian" ? "Italian Market" : "English Market",
          direction: postType || pillar || undefined,
        }]),
      }),
      fetch(`${API}/api/content/copywriter-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "approved", caption: editedCaption, platform, market, post_type: postType || undefined }),
      }),
    ]);
    setSaving(false);
    setSaved(true);
  }

  async function handleReject() {
    if (rejectNote.trim()) {
      await fetch(`${API}/api/content/copywriter-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rejected", platform, market, post_type: postType || undefined, note: rejectNote.trim() }),
      });
    }
    generate(rejectNote.trim() || undefined);
  }

  function copyCaption() {
    navigator.clipboard.writeText(editedCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addExample() {
    if (!draftExample.trim()) return;
    setExampleCopies(prev => [...prev, draftExample.trim()]);
    setDraftExample("");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <PenLine className="w-5 h-5 text-[#1e82b4]" />
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Copywriter</h1>
          </div>
          <p className="text-sm text-gray-400 font-light">Set up your post and generate. Keep regenerating until it's right.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 items-start">

          {/* ── Left: Form ─────────────────────────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-8">

            {/* Platform — VF only (GHS uses one unified tone) */}
            {!isGozo && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</label>
                <div className="flex gap-2">
                  {(["Facebook", "Instagram"] as const).map(p => (
                    <button key={p}
                      onClick={() => { setPlatform(p); if (p === "Instagram") setMarket("English"); }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1 justify-center",
                        platform === p
                          ? p === "Facebook" ? "bg-[#1877F2] text-white border-[#1877F2]" : "bg-[#E1306C] text-white border-[#E1306C]"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      {p === "Facebook" ? <Facebook className="w-4 h-4" /> : <Instagram className="w-4 h-4" />}
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Market — VF only (GHS has no Italian market) */}
            {!isGozo && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Market</label>
                <div className="flex gap-2">
                  {(["English", "Italian"] as const).map(m => (
                    <button key={m}
                      onClick={() => setMarket(m)}
                      disabled={platform === "Instagram" && m === "Italian"}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1 justify-center",
                        market === m ? "bg-[#1e82b4] text-white border-[#1e82b4]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
                        platform === "Instagram" && m === "Italian" && "opacity-30 cursor-not-allowed"
                      )}
                    >
                      <span className="text-base">{m === "English" ? "🇬🇧" : "🇮🇹"}</span>
                      {m}
                      {m === "Italian" && <span className="text-[10px] font-normal opacity-70">Facebook only</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Post type */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Post type</label>
              <div className="flex flex-wrap gap-1.5">
                {POST_TYPES.map(t => (
                  <button key={t}
                    onClick={() => setPostType(postType === t ? "" : t)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      postType === t ? "bg-[#1e82b4] text-white border-[#1e82b4]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Brief */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Post brief <span className="font-normal normal-case text-gray-300">optional</span></label>
              <textarea
                rows={5}
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder={market === "Italian" ? copywriterContent.promptPlaceholderIt : copywriterContent.promptPlaceholderEn}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light leading-relaxed"
              />
            </div>

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showAdvanced ? "Hide options" : "More options"}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5 overflow-hidden"
                >
                  {/* Pillar */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Content pillar <span className="font-normal normal-case text-gray-300">optional</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {pillars.map(p => (
                        <button key={p}
                          onClick={() => setPillar(pillar === p ? "" : p)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            pillar === p ? "bg-[#f6a610] text-white border-[#f6a610]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Format <span className="font-normal normal-case text-gray-300">optional</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {FORMATS.map(f => (
                        <button key={f}
                          onClick={() => setFormat(format === f ? "" : f)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            format === f ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Extra instructions <span className="font-normal normal-case text-gray-300">optional</span></label>
                    <textarea
                      rows={2}
                      value={toneNotes}
                      onChange={e => setToneNotes(e.target.value)}
                      placeholder="e.g. Keep it punchy and urgent. Emphasise limited seats."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light"
                    />
                  </div>

                  {/* Reference URL */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Reference post <span className="font-normal normal-case text-gray-300">optional</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={referenceUrl}
                        onChange={e => setReferenceUrl(e.target.value)}
                        placeholder="https://www.instagram.com/p/…"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white font-light"
                      />
                      {referenceUrl && (
                        <button onClick={() => setReferenceUrl("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">The AI adapts the format or style — not the content.</p>
                  </div>

                  {/* Previous copies that worked */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Copies that worked <span className="font-normal normal-case text-gray-300">optional</span>
                    </label>
                    <p className="text-[11px] text-gray-400">Paste captions you liked — the AI will match their style.</p>
                    {exampleCopies.map((ex, i) => (
                      <div key={i} className="relative bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 pr-8">
                        <p className="text-xs text-gray-600 font-light whitespace-pre-wrap">{ex}</p>
                        <button
                          onClick={() => setExampleCopies(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        value={draftExample}
                        onChange={e => setDraftExample(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && e.metaKey) addExample(); }}
                        placeholder="Paste a caption here…"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light"
                      />
                      <button
                        onClick={addExample}
                        disabled={!draftExample.trim()}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-gray-500 hover:border-[#1e82b4]/40 hover:text-[#1e82b4] hover:bg-[#1e82b4]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate button */}
            <button
              onClick={() => generate()}
              disabled={loading}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-extrabold transition-all tracking-wide",
                loading ? "bg-[#1e82b4]/60 text-white cursor-not-allowed" : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white shadow-sm hover:shadow-md"
              )}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : caption !== null
                  ? <><RefreshCw className="w-4 h-4" /> Generate new</>
                  : <><PenLine className="w-4 h-4" /> Generate</>}
            </button>
          </div>

          {/* ── Right: Output ───────────────────────────────────────── */}
          <div ref={outputRef}>
            <AnimatePresence mode="wait">

              {/* Loading skeleton */}
              {loading && (
                <motion.div key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="h-1 bg-[#1e82b4]/30 animate-pulse" />
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
                      <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
                      <div className="h-4 w-4/6 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Loader2 className="w-4 h-4 text-[#1e82b4] animate-spin" />
                      <span className="text-xs text-gray-400">Writing your caption…</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {!loading && error && (
                <motion.div key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="bg-red-50 border border-red-100 rounded-2xl p-6 text-sm text-red-600"
                >
                  {error}
                </motion.div>
              )}

              {/* Caption card */}
              {!loading && !error && caption !== null && (
                <motion.div key="caption"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="h-1 bg-[#1e82b4]" />
                  <div className="p-5 space-y-4">

                    {/* Meta chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isGozo && (
                        <>
                          <span className={cn(
                            "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white",
                            platform === "Facebook" ? "bg-[#1877F2]" : "bg-[#E1306C]"
                          )}>
                            {platform === "Facebook" ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                            {platform}
                          </span>
                          <span className="text-xs font-semibold text-[#1e82b4] bg-[#1e82b4]/10 px-2 py-0.5 rounded-full">
                            {market === "Italian" ? "🇮🇹" : "🇬🇧"} {market}
                          </span>
                        </>
                      )}
                      {postType && <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{postType}</span>}
                      {pillar && <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{pillar}</span>}
                      {format && <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{format}</span>}
                    </div>

                    {/* Caption — read or edit */}
                    {editing ? (
                      <div className="space-y-2">
                        <textarea
                          autoFocus
                          rows={6}
                          value={editedCaption}
                          onChange={e => setEditedCaption(e.target.value)}
                          className="w-full border border-[#1e82b4]/40 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light leading-relaxed"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditing(false)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#1e82b4] text-white hover:bg-[#1a6d99] transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Done
                          </button>
                          <button
                            onClick={() => { setEditedCaption(caption); setEditing(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:border-gray-300 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Reset
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-light">{editedCaption}</p>
                    )}

                    <CharCount text={editedCaption} platform={platform} />

                    {/* Primary actions */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <button onClick={copyCaption}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                          copied ? "bg-green-500 text-white" : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white"
                        )}>
                        {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                      </button>

                      <button
                        onClick={() => { setEditing(v => !v); }}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          editing
                            ? "bg-[#1e82b4]/10 border-[#1e82b4]/30 text-[#1e82b4]"
                            : "border-gray-200 text-gray-500 hover:border-[#1e82b4]/40 hover:text-[#1e82b4] hover:bg-[#1e82b4]/5"
                        )}>
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>

                      <button onClick={saveCaption} disabled={saving || saved}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          saved ? "bg-green-50 border-green-200 text-green-600"
                            : "border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600 hover:bg-green-50"
                        )}>
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
                        {saved ? "Saved to library" : "This worked"}
                      </button>

                      <button
                        onClick={() => setShowRejectForm(v => !v)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                          showRejectForm
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50"
                        )}>
                        <ThumbsDown className="w-3.5 h-3.5" /> Not this one
                      </button>

                      <button
                        onClick={() => generate()}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:border-[#1e82b4]/40 hover:text-[#1e82b4] hover:bg-[#1e82b4]/5 transition-all ml-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                    </div>

                    {/* Reject + regenerate form */}
                    <AnimatePresence>
                      {showRejectForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden space-y-2"
                        >
                          <textarea
                            autoFocus
                            rows={2}
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            placeholder="What's off? e.g. «too salesy», «opening is weak» — or leave blank to just regenerate"
                            className="w-full border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-100 focus:border-amber-300 bg-white resize-none font-light"
                          />
                          <button
                            onClick={handleReject}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            {rejectNote.trim() ? "Note it and try again" : "Try again"}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {/* Empty state */}
              {!loading && !error && caption === null && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-10 flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#1e82b4]/10 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-[#1e82b4]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Ready when you are</p>
                  <p className="text-xs text-gray-400 max-w-xs font-light">Set up your post on the left and hit Generate. Keep regenerating until it's right.</p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
