import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Facebook, Instagram, PenLine, Loader2, Copy, Check,
  RefreshCw, ChevronDown, ChevronUp, Link2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const PILLARS_ENGLISH = ["Why VF", "Why Sicily", "VF Recommends", "VF Experience", "Sicily Experience"];
const PILLARS_ITALIAN = ["Why VF", "Why Malta", "VF Recommends", "VF Experience", "Malta Experience"];
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
  const [platform, setPlatform] = useState<"Facebook" | "Instagram">("Facebook");
  const [market, setMarket] = useState<"English" | "Italian">("English");
  const [pillar, setPillar] = useState("");
  const [format, setFormat] = useState("");
  const [brief, setBrief] = useState("");
  const [toneNotes, setToneNotes] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ caption: string; cta: string; hashtags: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  const pillars = market === "Italian" ? PILLARS_ITALIAN : PILLARS_ENGLISH;

  async function generate() {
    if (!brief.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`${API}/api/content/quick-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform, market,
          brief: brief.trim(),
          pillar: pillar || undefined,
          format: format || undefined,
          tone_notes: toneNotes.trim() || undefined,
          reference_url: referenceUrl.trim() || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      setResult(data);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyCaption() {
    if (!result) return;
    const full = [result.caption, result.hashtags?.length ? result.hashtags.join(" ") : ""].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setResult(null);
    setError("");
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
          <p className="text-sm text-gray-400 font-light">Describe any post and get a ready-to-publish caption.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ── Left: Form ─────────────────────────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-8">

            {/* Platform */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</label>
              <div className="flex gap-2">
                {(["Facebook", "Instagram"] as const).map(p => (
                  <button
                    key={p}
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

            {/* Market */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Market</label>
              <div className="flex gap-2">
                {(["English", "Italian"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMarket(m)}
                    disabled={platform === "Instagram" && m === "Italian"}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex-1 justify-center",
                      market === m
                        ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300",
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

            {/* Brief */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Post brief</label>
              <textarea
                rows={5}
                value={brief}
                onChange={e => setBrief(e.target.value)}
                placeholder={market === "Italian"
                  ? "Descrivi il post — ad es. «promozione biglietti estivi, focus su Valletta al tramonto»"
                  : "Describe the post — e.g. «summer offer for couples, Sicily at sunset, warm and inviting tone»"}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light leading-relaxed"
              />
            </div>

            {/* Advanced options toggle */}
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
                        <button
                          key={p}
                          onClick={() => setPillar(pillar === p ? "" : p)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            pillar === p
                              ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
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
                        <button
                          key={f}
                          onClick={() => setFormat(format === f ? "" : f)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            format === f
                              ? "bg-[#f6a610] text-white border-[#f6a610]"
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tone / extra instructions <span className="font-normal normal-case text-gray-300">optional</span></label>
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
                    <p className="text-[11px] text-gray-400">Paste a post link — the AI will adapt the format or style, not the content.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading || !brief.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                loading || !brief.trim()
                  ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                  : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white shadow-sm"
              )}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Writing…</>
              ) : (
                <><PenLine className="w-4 h-4" /> Write copy</>
              )}
            </button>
          </div>

          {/* ── Right: Output ───────────────────────────────────────── */}
          <div ref={outputRef}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-50 border border-red-100 rounded-2xl p-5 text-sm text-red-600"
                >
                  {error}
                </motion.div>
              )}

              {loading && !result && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-8 flex flex-col items-center gap-3"
                >
                  <Loader2 className="w-6 h-6 text-[#1e82b4] animate-spin" />
                  <p className="text-sm text-gray-400 font-light">Writing your caption…</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Card top bar */}
                  <div className="h-1 bg-[#1e82b4]" />

                  <div className="p-6 space-y-5">
                    {/* Meta chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white",
                        platform === "Facebook" ? "bg-[#1877F2]" : "bg-[#E1306C]"
                      )}>
                        {platform === "Facebook" ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                        {platform}
                      </span>
                      <span className="text-xs font-semibold text-[#1e82b4] bg-[#1e82b4]/10 px-2.5 py-1 rounded-full">
                        {market === "Italian" ? "🇮🇹 Italian" : "🇬🇧 English"}
                      </span>
                      {pillar && (
                        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">{pillar}</span>
                      )}
                      {format && (
                        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">{format}</span>
                      )}
                    </div>

                    {/* Caption */}
                    <div className="space-y-3">
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-light">{result.caption}</p>
                      {result.hashtags && result.hashtags.length > 0 && (
                        <p className="text-sm text-[#1e82b4] leading-relaxed">{result.hashtags.join(" ")}</p>
                      )}
                    </div>

                    {/* Char count */}
                    <CharCount text={result.caption} platform={platform} />

                    {/* CTA */}
                    {result.cta && (
                      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Call to action</p>
                        <p className="text-sm text-gray-700 font-medium">{result.cta}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={copyCaption}
                        className={cn(
                          "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                          copied
                            ? "bg-green-500 text-white"
                            : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white"
                        )}
                      >
                        {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy caption</>}
                      </button>
                      <button
                        onClick={generate}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                      <button
                        onClick={reset}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-all ml-auto"
                      >
                        <X className="w-3.5 h-3.5" /> Clear
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {!result && !loading && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gray-50 border border-gray-100 rounded-2xl p-10 flex flex-col items-center gap-3 text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1e82b4]/10 flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-[#1e82b4]" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Ready when you are</p>
                  <p className="text-xs text-gray-400 max-w-xs font-light">Describe any post on the left — platform, market, and brief — and the AI will write a ready-to-publish caption.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
