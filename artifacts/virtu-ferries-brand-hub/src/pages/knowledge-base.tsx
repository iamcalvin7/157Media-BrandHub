import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Milestone, Ship, Star, BadgePercent, Compass, Share2,
  ChevronDown, ChevronRight, Sparkles, FileText, CheckCircle2, Plus,
  Brain, Loader2, MessageSquareQuote, NotebookPen, Trash2, Mic2,
} from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListChangelogEntries,
  useListBrandVoiceNotes,
  useCreateBrandVoiceNote,
  useDeleteBrandVoiceNote,
  getListBrandVoiceNotesQueryKey,
} from "@workspace/api-client-react";
import { formatBrandKnowledgeAsPrompt } from "@workspace/brand-knowledge/prompt";
import { useBrand } from "@/lib/brand";
import { useBrandContent } from "@/lib/brand-content";

type Section = {
  id: string;
  title: string;
  icon: React.ElementType;
  hasContent: boolean;
  emptyHint: string;
  render: () => React.ReactNode;
};

function SectionCard({ section }: { section: Section }) {
  const Icon = section.icon;
  return (
    <section
      data-testid={`kb-section-${section.id}`}
      className="bg-[#141414] border border-[#262626] rounded-2xl p-6 md:p-8 space-y-5"
    >
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#39A15F]/15 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#39A15F]" />
        </div>
        <h2 className="text-xl font-bold text-[#FAFAFA]">{section.title}</h2>
        {section.hasContent ? (
          <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#39A15F]/15 text-[#39A15F] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> in agent's knowledge
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1A1A1A] text-[#71717A] text-xs font-medium border border-[#262626]">
            not configured
          </span>
        )}
      </header>
      {section.hasContent ? (
        <div className="text-[#A1A1AA] text-sm space-y-4 leading-relaxed">{section.render()}</div>
      ) : (
        <p className="text-sm text-[#71717A] italic">{section.emptyHint}</p>
      )}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-[#39A15F] mt-1">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function getCategoryIcon(cat: string) {
  if (cat.toLowerCase().includes("brand")) return <Sparkles className="w-4 h-4 text-[#39A15F]" />;
  if (cat.toLowerCase().includes("asset") || cat.toLowerCase().includes("guideline"))
    return <FileText className="w-4 h-4 text-[#39A15F]" />;
  return <CheckCircle2 className="w-4 h-4 text-[#71717A]" />;
}

export default function KnowledgeBase() {
  const content = useBrandContent();
  const { activeBrand, activeBrandSlug } = useBrand();
  const { data: changelogEntries, isLoading: changelogLoading } = useListChangelogEntries();
  const [agentViewOpen, setAgentViewOpen] = useState(false);

  const slug = activeBrand?.slug;
  const brandLabel = content.brandShortLabel || "this brand";

  // The same text that gets injected into the AI agent's system prompt.
  const agentPromptBlock = useMemo(
    () => formatBrandKnowledgeAsPrompt(slug),
    [slug],
  );

  const sections: Section[] = [
    {
      id: "identity",
      title: "Brand identity",
      icon: BookOpen,
      hasContent:
        !!content.identity.brandStory.trim() ||
        content.identity.toneOfVoice.length > 0 ||
        content.identity.keyMessages.length > 0,
      emptyHint:
        "Add the brand story, tone of voice, key messages, and copy do's & don'ts so the agent has a voice to write in.",
      render: () => (
        <>
          {content.identity.brandStory && (
            <p className="italic text-[#A1A1AA]">{content.identity.brandStory}</p>
          )}
          {content.identity.toneOfVoice.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Tone of voice</p>
              <BulletList items={content.identity.toneOfVoice} />
            </div>
          )}
          {content.identity.keyMessages.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Key messages</p>
              <BulletList items={content.identity.keyMessages} />
            </div>
          )}
          {content.identity.whatToSay.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">What to say</p>
              <BulletList items={content.identity.whatToSay} />
            </div>
          )}
          {content.identity.whatNotToSay.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">What NOT to say</p>
              <BulletList items={content.identity.whatNotToSay} />
            </div>
          )}
        </>
      ),
    },
    {
      id: "history",
      title: "Brand history",
      icon: Milestone,
      hasContent: content.history.timeline.length > 0 || content.history.heritage.length > 0,
      emptyHint:
        "Add the founding story, milestones, and heritage notes the agent should reference when writing legacy-led copy.",
      render: () => (
        <>
          {content.history.hero?.subtitle && (
            <p className="italic text-[#A1A1AA]">{content.history.hero.subtitle}</p>
          )}
          {content.history.timeline.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Timeline</p>
              <ul className="space-y-2.5">
                {content.history.timeline.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="font-mono text-xs text-[#71717A] mt-0.5 min-w-[3.5rem]">{t.year}</span>
                    <span><span className="font-semibold text-[#FAFAFA]">{t.title}.</span> {t.body}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {content.history.heritage.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Heritage notes</p>
              <ul className="space-y-1.5">
                {content.history.heritage.map((h, i) => (
                  <li key={i}><span className="font-semibold text-[#FAFAFA]">{h.title}.</span> {h.body}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ),
    },
    {
      id: "fleet",
      title: "Fleet",
      icon: Ship,
      hasContent: content.history.vessels.length > 0,
      emptyHint: "Add vessels (name, role, capacity, hull, in-service date) so the agent can name them accurately.",
      render: () => (
        <ul className="space-y-3">
          {content.history.vessels.map((v, i) => (
            <li key={i}>
              <p className="font-semibold text-[#FAFAFA]">{v.name} <span className="text-xs text-[#71717A] font-normal">— {v.role} · {v.length} · {v.capacity}</span></p>
              <p className="text-[#A1A1AA] mt-1">{v.description}</p>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "usps",
      title: "Unique selling points",
      icon: Star,
      hasContent: content.usp.sections.some((s) => s.items.length > 0),
      emptyHint: "Add USP groups (Route, Speed & Convenience, Fleet, etc.) so the agent has positioning to lean on.",
      render: () => (
        <div className="grid md:grid-cols-2 gap-4">
          {content.usp.sections.map((s, i) => (
            <div key={i}>
              <p className="font-semibold text-[#FAFAFA] mb-2">{s.title}</p>
              <BulletList items={s.items} />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "offers",
      title: "Live offers & pricing",
      icon: BadgePercent,
      hasContent: content.offers.offers.length > 0,
      emptyHint: "Add current offers — agent uses these to write promotional copy with accurate prices and validity.",
      render: () => (
        <ul className="space-y-4">
          {content.offers.offers.map((o, i) => (
            <li key={i} className="border-l-2 border-[#39A15F] pl-4">
              <p className="font-semibold text-[#FAFAFA]">{o.name} <span className="text-xs text-[#71717A] font-normal">· {o.badge}</span></p>
              <p className="text-[#A1A1AA] mt-1">{o.description}</p>
              {o.hook && <p className="italic text-[#71717A] mt-1">"{o.hook}"</p>}
              <p className="text-xs text-[#71717A] mt-2">
                {o.prices.map((p) => `${p.label}: ${p.value}`).join(" · ")}
              </p>
              {o.validity && <p className="text-xs text-[#52525B] mt-1">{o.validity}</p>}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "travel",
      title: "Travel info (operational reference)",
      icon: Compass,
      hasContent: content.travelInfo.sections.length > 0,
      emptyHint: "Add booking, baggage, pets, accessibility rules — the agent uses this to answer passenger questions.",
      render: () => (
        <ul className="space-y-3">
          {content.travelInfo.sections.map((s) => (
            <li key={s.id}>
              <p className="font-semibold text-[#FAFAFA]">{s.title}</p>
              {s.intro && <p className="text-[#A1A1AA] mt-1">{s.intro}</p>}
              {s.bullets && <BulletList items={s.bullets} />}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "social",
      title: "Social media reference",
      icon: Share2,
      hasContent:
        content.socialMedia.markets.length > 0 ||
        content.socialMedia.pillars.length > 0 ||
        content.socialMedia.registers.length > 0 ||
        (content.socialMedia.recurringPosts?.length ?? 0) > 0 ||
        (content.sicilyTowns?.groups.length ?? 0) > 0,
      emptyHint: "Add markets, audiences, content pillars, and tone registers so the agent matches each channel.",
      render: () => (
        <>
          {content.socialMedia.markets.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Markets & channels</p>
              <ul className="space-y-2">
                {content.socialMedia.markets.map((m, i) => (
                  <li key={i}>
                    <span className="font-semibold text-[#FAFAFA]">{m.market}.</span> {m.audience}. <span className="italic text-[#71717A]">{m.frame}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {content.socialMedia.pillars.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Content pillars</p>
              <BulletList items={content.socialMedia.pillars.map((p) => `${p.number} ${p.title} — ${p.desc}`)} />
            </div>
          )}
          {content.socialMedia.registers.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Tone registers</p>
              <BulletList items={content.socialMedia.registers.map((r) => `${r.label} — ${r.desc} (e.g. "${r.example}")`)} />
            </div>
          )}
          {content.socialMedia.recurringPosts && content.socialMedia.recurringPosts.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">Recurring content (always-on slots)</p>
              <BulletList
                items={content.socialMedia.recurringPosts.map((r) => {
                  const head = `${r.cadence}${r.day ? ` (${r.day})` : ""} — ${r.title}`;
                  const where = [r.market, r.channel].filter(Boolean).join(" · ");
                  const whereLine = where ? ` Where: ${where}.` : "";
                  const noteLine = r.notes ? ` Notes: ${r.notes}` : "";
                  return `${head}. ${r.what}${whereLine}${noteLine}`;
                })}
              />
            </div>
          )}
          {content.sicilyTowns && content.sicilyTowns.groups.length > 0 && (
            <div>
              <p className="font-semibold text-[#FAFAFA] mb-2">{content.sicilyTowns.headerTitle}</p>
              <div className="space-y-3">
                {content.sicilyTowns.groups.map((g) => (
                  <div key={g.bracket}>
                    <p className="text-[#A1A1AA] text-sm font-semibold">{g.bracket}</p>
                    <BulletList items={g.towns.map((t) => `${t.name} — ${t.description}`)} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ),
    },
  ];

  const populatedCount = sections.filter((s) => s.hasContent).length;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 pb-24"
      >
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#39A15F]/15 text-[#39A15F] text-xs font-semibold">
            <Brain className="w-3.5 h-3.5" />
            AGENT KNOWLEDGE BASE
          </div>
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#FAFAFA] tracking-tight">
            What the agent knows about {brandLabel}
          </h1>
          <p className="text-lg text-[#A1A1AA] font-light max-w-3xl">
            Every section below is fed directly into the AI agent's system prompt on every request. Adding or editing a section automatically updates the agent's knowledge — there is no separate sync step.
          </p>
          <p className="text-sm text-[#71717A]">
            {populatedCount} of {sections.length} sections currently configured for this brand.
          </p>
        </header>

        <div className="space-y-6">
          {sections.map((s) => (
            <SectionCard key={s.id} section={s} />
          ))}
        </div>

        {/* Custom guidelines — manual brand_voice_notes the user can curate */}
        <CustomGuidelinesSection />

        {/* Voice profiles — per-post-type voice spec the copywriter uses (GHS-only for now) */}
        {activeBrandSlug === "gozo-highspeed" && <VoiceProfilesSection />}

        {/* Agent prompt preview — exact text injected into the LLM */}
        <section className="bg-[#000000] border border-[#262626] text-[#A1A1AA] rounded-2xl overflow-hidden">
          <button
            type="button"
            onClick={() => setAgentViewOpen((v) => !v)}
            data-testid="kb-agent-view-toggle"
            className="w-full flex items-center gap-3 p-6 text-left hover:bg-[#0A0A0A] transition-colors"
          >
            <MessageSquareQuote className="w-5 h-5 text-[#39A15F]" />
            <div className="flex-1">
              <p className="font-bold text-[#FAFAFA]">Agent's view (raw prompt block)</p>
              <p className="text-xs text-[#71717A] mt-0.5">
                The exact markdown the AI receives, formatted from the data above.
              </p>
            </div>
            {agentViewOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
          {agentViewOpen && (
            <pre
              data-testid="kb-agent-prompt-block"
              className="px-6 pb-6 text-xs font-mono whitespace-pre-wrap text-[#A1A1AA] max-h-[60vh] overflow-y-auto"
            >
              {agentPromptBlock || "No structured knowledge configured for this brand yet. The agent receives only the editorial brief."}
            </pre>
          )}
        </section>

        {/* Embedded changelog */}
        <section data-testid="kb-changelog" className="space-y-5">
          <header className="space-y-1.5">
            <h2 className="text-2xl font-bold text-[#FAFAFA]">Knowledge changelog</h2>
            <p className="text-sm text-[#71717A]">A running history of updates to {brandLabel}'s brand knowledge and AI agent capabilities.</p>
          </header>

          {changelogLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-[#39A15F] animate-spin" />
            </div>
          ) : !changelogEntries || changelogEntries.length === 0 ? (
            <div className="text-center py-10 bg-[#141414] border border-[#262626] rounded-2xl">
              <p className="text-[#71717A] text-sm">No changelog entries yet.</p>
            </div>
          ) : (
            <div className="relative border-l border-[#262626] ml-4 space-y-8 pb-4">
              {changelogEntries.map((entry, index) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.4) }}
                  key={entry.id}
                  className="relative pl-8"
                >
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[#39A15F] ring-4 ring-[#0A0A0A]"></div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-[#71717A] font-mono">
                        {format(new Date(entry.date), "MMM dd, yyyy")}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#1A1A1A] border border-[#262626] text-xs font-medium text-[#FAFAFA] flex items-center gap-1.5">
                        {getCategoryIcon(entry.category)}
                        {entry.category}
                      </span>
                    </div>
                    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3">
                      <p className="text-[#FAFAFA] font-medium">{entry.summary}</p>
                      {entry.capabilities && entry.capabilities.length > 0 && (
                        <ul className="space-y-1.5 pt-2 border-t border-[#262626]">
                          {entry.capabilities.map((cap, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-[#A1A1AA]">
                              <Plus className="w-3.5 h-3.5 text-[#39A15F] shrink-0 mt-0.5" />
                              {cap}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}

// ─── Custom guidelines (manual brand_voice_notes) ────────────────────────────

function CustomGuidelinesSection() {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useListBrandVoiceNotes();
  const createMutation = useCreateBrandVoiceNote();
  const deleteMutation = useDeleteBrandVoiceNote();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: getListBrandVoiceNotesQueryKey() });

  const handleSave = async () => {
    const text = draft.trim();
    if (!text) return;
    await createMutation.mutateAsync({ data: { note: text } });
    setDraft("");
    setAdding(false);
    refetch();
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    refetch();
  };

  const hasNotes = (notes?.length ?? 0) > 0;

  return (
    <section
      data-testid="kb-section-custom-guidelines"
      className="bg-[#141414] border border-[#262626] rounded-2xl p-6 md:p-8 space-y-5"
    >
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#39A15F]/15 flex items-center justify-center">
          <NotebookPen className="w-5 h-5 text-[#39A15F]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#FAFAFA]">Custom guidelines</h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Freeform rules and reminders the agent reads alongside the structured sections above.
          </p>
        </div>
        {hasNotes && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#39A15F]/15 text-[#39A15F] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> in agent's knowledge
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-[#39A15F] animate-spin" />
        </div>
      ) : !hasNotes && !adding ? (
        <p className="text-sm text-[#71717A] italic">
          No custom guidelines yet. Add one-off rules like ordering preferences, banned words,
          or style reminders the agent should always follow.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes!.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 bg-[#0A0A0A] border border-[#262626] rounded-xl p-4 group"
            >
              <span className="text-[#39A15F] mt-1 shrink-0">•</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#FAFAFA] whitespace-pre-wrap leading-relaxed">{n.note}</p>
                <p className="text-[10px] text-[#52525B] mt-2 font-mono">
                  Added {format(new Date(n.createdAt), "MMM d, yyyy · HH:mm")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(n.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-[#71717A] hover:text-red-400 hover:bg-red-500/10"
                title="Delete this guideline"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            placeholder="e.g. When promoting from Malta, list cities as Valletta, Sliema, Bugibba."
            rows={4}
            className="w-full bg-[#0A0A0A] border border-[#262626] rounded-xl p-3 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#39A15F]/50"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!draft.trim() || createMutation.isPending}
              className="px-4 py-2 rounded-lg bg-[#39A15F] text-white text-sm font-semibold hover:bg-[#2d8049] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#262626] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-[#39A15F] hover:bg-[#39A15F]/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add guideline
        </button>
      )}
    </section>
  );
}

// ─── Voice profiles (per post type) ──────────────────────────────────────────
// Used by the Copywriter for Gozo Highspeed. Each post type has a small voice
// spec that the AI follows verbatim, instead of triangulating tone from a
// soup of past posts and rules.

type VoiceProfile = {
  id: number;
  brand_id: number;
  post_type: string;
  tone: string;
  length: string;
  opening: string;
  cta: string;
  avoid: string;
  anchor_example: string;
  updated_at: string;
};

const PROFILE_FIELDS: Array<{ key: keyof Omit<VoiceProfile, "id" | "brand_id" | "post_type" | "updated_at">; label: string; placeholder: string; multiline?: boolean }> = [
  { key: "tone", label: "Tone", placeholder: "e.g. Calm, factual, helpful. No hype." },
  { key: "length", label: "Length", placeholder: "e.g. 1–2 short sentences." },
  { key: "opening", label: "Opening", placeholder: "e.g. Lead with the change — date, route, time." },
  { key: "cta", label: "CTA", placeholder: "e.g. Book at gozohighspeed.com (woven into the body)." },
  { key: "avoid", label: "Avoid", placeholder: "e.g. Exclamation marks, emojis in lead, 'exciting news'." },
  { key: "anchor_example", label: "Anchor caption (style reference)", placeholder: "Write one perfect example caption.", multiline: true },
];

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function VoiceProfilesSection() {
  const [profiles, setProfiles] = useState<VoiceProfile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openType, setOpenType] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/content/voice-profiles`);
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const data = await res.json() as VoiceProfile[];
        if (!cancelled) setProfiles(data);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (postType: string, draft: Partial<VoiceProfile>) => {
    const res = await fetch(`${API_BASE}/api/content/voice-profiles/${encodeURIComponent(postType)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
    const saved = await res.json() as VoiceProfile;
    setProfiles((prev) => prev?.map((p) => p.post_type === postType ? saved : p) ?? [saved]);
    return saved;
  };

  const filledCount = (profiles ?? []).filter((p) =>
    p.tone || p.length || p.opening || p.cta || p.avoid || p.anchor_example
  ).length;

  return (
    <section
      data-testid="kb-section-voice-profiles"
      className="bg-[#141414] border border-[#262626] rounded-2xl p-6 md:p-8 space-y-5"
    >
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#39A15F]/15 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-[#39A15F]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-[#FAFAFA]">Voice profiles</h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            One voice spec per post type. The Copywriter loads the matching profile and follows it verbatim — set it once, reuse forever.
          </p>
        </div>
        {filledCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#39A15F]/15 text-[#39A15F] text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {filledCount} configured
          </span>
        )}
      </header>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-[#39A15F] animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : !profiles || profiles.length === 0 ? (
        <p className="text-sm text-[#71717A] italic">No voice profiles yet.</p>
      ) : (
        <ul className="space-y-3">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              isOpen={openType === p.post_type}
              onToggle={() => setOpenType((prev) => prev === p.post_type ? null : p.post_type)}
              onSave={(draft) => handleSave(p.post_type, draft)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileCard({
  profile,
  isOpen,
  onToggle,
  onSave,
}: {
  profile: VoiceProfile;
  isOpen: boolean;
  onToggle: () => void;
  onSave: (draft: Partial<VoiceProfile>) => Promise<VoiceProfile>;
}) {
  const [draft, setDraft] = useState<Partial<VoiceProfile>>(profile);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState("");

  // Sync draft when the profile from the parent updates (e.g. after a sibling save)
  useEffect(() => { setDraft(profile); setSavedAt(null); setErr(""); }, [profile]);

  const dirty = PROFILE_FIELDS.some((f) => (draft[f.key] ?? "") !== (profile[f.key] ?? ""));

  const handleSave = async () => {
    try {
      setSaving(true);
      setErr("");
      const saved = await onSave(draft);
      setDraft(saved);
      setSavedAt("just now");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="bg-[#0A0A0A] border border-[#262626] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#141414] transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-[#71717A]" /> : <ChevronRight className="w-4 h-4 text-[#71717A]" />}
        <span className="text-sm font-semibold text-[#FAFAFA] flex-1">{profile.post_type}</span>
        <span className="text-[10px] text-[#52525B] font-mono">
          {format(new Date(profile.updated_at), "MMM d, yyyy")}
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-[#262626]">
          {PROFILE_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">{f.label}</label>
              {f.multiline ? (
                <textarea
                  rows={3}
                  value={(draft[f.key] as string) ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#39A15F]/50 resize-none font-light leading-relaxed"
                />
              ) : (
                <input
                  type="text"
                  value={(draft[f.key] as string) ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-2 text-sm text-[#FAFAFA] placeholder:text-[#52525B] focus:outline-none focus:border-[#39A15F]/50 font-light"
                />
              )}
            </div>
          ))}
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-lg bg-[#39A15F] text-white text-sm font-semibold hover:bg-[#2d8049] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
            {savedAt && !dirty && (
              <span className="text-xs text-[#52525B]">Saved {savedAt}</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
