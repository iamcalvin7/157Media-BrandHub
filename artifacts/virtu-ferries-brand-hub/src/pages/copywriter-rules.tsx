import { useState, useEffect } from "react";
import { BookOpen, Pencil, Check, X, Loader2, Save, RotateCcw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type RulesData = { content: string; updated_at: string };

function RulesDisplay({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-6">
      {(() => {
        const sections: { heading: string | null; lines: string[] }[] = [];
        let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };

        for (const line of lines) {
          const isHeading = line.trim() !== "" && !line.startsWith("-") && !line.startsWith(" ") && line === line.toUpperCase() && line.trim().length > 2;
          if (isHeading) {
            if (current.heading !== null || current.lines.some(l => l.trim())) {
              sections.push(current);
            }
            current = { heading: line.trim(), lines: [] };
          } else {
            current.lines.push(line);
          }
        }
        if (current.heading !== null || current.lines.some(l => l.trim())) {
          sections.push(current);
        }

        return sections.map((section, i) => (
          <div key={i} className="space-y-3">
            {section.heading && (
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">
                {section.heading}
              </h3>
            )}
            <div className="space-y-1.5">
              {section.lines
                .filter((l, idx, arr) => !(l.trim() === "" && (idx === 0 || arr[idx - 1]?.trim() === "")))
                .map((line, j) => {
                  if (!line.trim()) return <div key={j} className="h-1" />;
                  if (line.startsWith("- ")) {
                    return (
                      <div key={j} className="flex gap-2.5 items-start">
                        <span className="text-[#1e82b4] mt-1 shrink-0 text-xs">●</span>
                        <p className="text-sm text-gray-700 leading-relaxed font-light">{line.slice(2)}</p>
                      </div>
                    );
                  }
                  return (
                    <p key={j} className="text-sm text-gray-700 leading-relaxed font-light">{line}</p>
                  );
                })}
            </div>
          </div>
        ));
      })()}
    </div>
  );
}

export default function CopywriterRules() {
  const [data, setData] = useState<RulesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/content/copywriter-rules`)
      .then(r => r.json())
      .then((d: RulesData) => { setData(d); setDraft(d.content); })
      .catch(() => setError("Failed to load rules"))
      .finally(() => setLoading(false));
  }, []);

  function startEdit() {
    setDraft(data?.content ?? "");
    setEditing(true);
    setSaved(false);
  }

  function cancelEdit() {
    setDraft(data?.content ?? "");
    setEditing(false);
    setError("");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/content/copywriter-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated: RulesData = await res.json();
      setData(updated);
      setDraft(updated.content);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!data) return;
    setDraft(data.content);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-[#1e82b4]" />
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Copywriting Rules</h1>
            </div>
            <p className="text-sm text-gray-400 font-light">
              The voice standard the AI follows every time it generates copy. Edit to update the rules instantly.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saved && !editing && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded-xl">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {!editing && !loading && (
              <button
                onClick={startEdit}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-[#1e82b4]/40 hover:text-[#1e82b4] hover:bg-[#1e82b4]/5 transition-all"
              >
                <Pencil className="w-4 h-4" /> Edit rules
              </button>
            )}
            {editing && (
              <>
                <button
                  onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-300 transition-all"
                  title="Reset to last saved"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:border-gray-300 transition-all"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || !draft.trim()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    saving || !draft.trim()
                      ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                      : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white"
                  )}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save rules"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Last updated */}
        {data && !editing && (
          <p className="text-xs text-gray-300">
            Last updated {new Date(data.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 text-[#1e82b4] animate-spin" />
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Use ALL CAPS lines for section headings. Start bullet points with "- ".</span>
            </div>
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={30}
              className="w-full border border-[#1e82b4]/30 rounded-2xl px-5 py-4 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-y"
              spellCheck={false}
            />
          </div>
        ) : data ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-8 py-8">
            <RulesDisplay content={data.content} />
          </div>
        ) : null}

        {/* Info note */}
        {!loading && !editing && (
          <p className="text-xs text-gray-300 text-center">
            Changes take effect immediately on the next caption generation.
          </p>
        )}
      </div>
    </div>
  );
}
