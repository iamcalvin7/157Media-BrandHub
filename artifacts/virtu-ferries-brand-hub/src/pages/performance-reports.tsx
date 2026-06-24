import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, Upload, Trash2, ChevronRight, Facebook, Instagram, TrendingUp, TrendingDown, Eye, Users, UserPlus, Heart, MessageCircle, Share2, ExternalLink, ArrowLeft, Clock, CalendarDays, AlertCircle, X, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_BASE_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Report {
  id: number;
  brand_id: number;
  platform: "Facebook" | "Instagram";
  month: string;
  label: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  source_file_name: string | null;
  post_count: number;
  status: string;
}

interface ReportPost {
  id: number;
  report_id: number;
  platform: string;
  post_id_external: string | null;
  permalink: string | null;
  publish_time: string | null;
  post_type: string | null;
  caption: string | null;
  duration_sec: number | null;
  account_username: string | null;
  is_partner: boolean;
  is_crosspost: boolean;
  is_share: boolean;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  follows: number | null;
  link_clicks: number | null;
  total_clicks: number | null;
  content_post_id: number | null;
}

interface ReportSummary {
  total_posts: number;
  total_views: number | null;
  total_reach: number | null;
  total_likes: number | null;
  total_comments: number | null;
  total_shares: number | null;
  total_saves: number | null;
  total_follows: number | null;
  total_link_clicks: number | null;
  page_net_follows: number | null;
  page_unfollows: number | null;
  page_total_followers: number | null;
  engagement_rate: string | null;
  top_post_ids: number[];
  bottom_post_ids: number[];
  best_day_of_week: string | null;
  best_hour_of_day: number | null;
  ai_analysis: string | null;
  ai_analysis_generated_at: string | null;
}

interface ReportDetail {
  report: Report;
  summary: ReportSummary | null;
  posts: ReportPost[];
  topPosts: ReportPost[];
  bottomPosts: ReportPost[];
  prevSummary: ReportSummary | null;
  prevMonth: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtEngRate(v: string | null | undefined): string {
  if (!v) return "—";
  return parseFloat(v).toFixed(2) + "%";
}

function fmtHour(h: number | null): string {
  if (h === null) return "—";
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${ampm}`;
}

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

const card = "bg-white border border-[#F4F4F5] rounded-xl";

// ─── Delta helpers ────────────────────────────────────────────────────────────
function pctDelta(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function DeltaCard({
  label,
  current,
  previous,
  icon: Icon,
  isRate = false,
}: {
  label: string;
  current: number | null | undefined;
  previous: number | null | undefined;
  icon: React.ElementType;
  isRate?: boolean;
}) {
  const delta = pctDelta(current, previous);
  const isUp = delta !== null && delta > 0;
  const isDown = delta !== null && delta < 0;
  const isFlat = delta !== null && delta === 0;

  const DeltaIcon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const deltaColor = isUp ? "text-emerald-600" : "text-[#52525B]";
  const deltaBg = "bg-white border border-[#E4E4E7]";

  const fmtVal = (v: number | null | undefined) => {
    if (v == null) return "—";
    if (isRate) return parseFloat(String(v)).toFixed(2) + "%";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
    return v.toLocaleString();
  };

  return (
    <div className={cn(card, "p-4 flex flex-col gap-2")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[#A1A1AA]">
          <Icon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
        </div>
        {delta !== null && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full", deltaColor, deltaBg)}>
            <DeltaIcon className="w-3 h-3" />
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {delta === null && previous != null && (
          <span className="text-[10px] text-[#A1A1AA]">no prev.</span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-[20px] font-semibold text-[#18181B] num-tabular tracking-[-0.02em]">{fmtVal(current)}</span>
        {previous != null && (
          <span className="text-[11px] text-[#A1A1AA] pb-0.5">was {fmtVal(previous)}</span>
        )}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <div className={cn(card, "p-4 flex flex-col gap-1")}>
      <div className="flex items-center gap-1.5 text-[#A1A1AA]">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-[22px] font-semibold text-[#18181B] num-tabular tracking-[-0.02em]">{value}</span>
      {sub && <span className="text-[11px] text-[#A1A1AA]">{sub}</span>}
    </div>
  );
}

// ─── Post row ─────────────────────────────────────────────────────────────────
function PostRow({ post, rank, highlight }: { post: ReportPost; rank?: number; highlight?: "top" | "bottom" }) {
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 border-b border-[#F4F4F5] last:border-0 hover:bg-[#FAFAFA] transition-colors",
    )}>
      {rank !== undefined && (
        <span className={cn(
          "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold mt-0.5",
          highlight === "top" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
        )}>
          {rank}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {post.post_type && (
            <span className="text-[10px] font-medium bg-[#F4F4F5] text-[#71717A] px-1.5 py-0.5 rounded">{post.post_type}</span>
          )}
          {post.is_partner && (
            <span className="text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">Partner</span>
          )}
          {post.is_crosspost && (
            <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Crosspost</span>
          )}
          {post.content_post_id && (
            <span className="text-[10px] font-medium bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">Linked to calendar</span>
          )}
          {post.publish_time && (
            <span className="text-[10px] text-[#A1A1AA]">{new Date(post.publish_time).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </div>
        <p className="text-[12px] text-[#3F3F46] leading-relaxed line-clamp-2">{post.caption || <span className="text-[#A1A1AA] italic">No caption</span>}</p>
      </div>
      <div className="flex-shrink-0 flex items-center gap-4 text-right">
        <div>
          <div className="text-[13px] font-semibold text-[#18181B] num-tabular">{fmt(post.views)}</div>
          <div className="text-[10px] text-[#A1A1AA]">views</div>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#18181B] num-tabular">{fmt(post.reach)}</div>
          <div className="text-[10px] text-[#A1A1AA]">reach</div>
        </div>
        <div>
          <div className="text-[13px] font-semibold text-[#18181B] num-tabular">{fmt((post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0) + (post.saves ?? 0))}</div>
          <div className="text-[10px] text-[#A1A1AA]">eng.</div>
        </div>
        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="text-[#A1A1AA] hover:text-[#18181B] transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Analysis card ────────────────────────────────────────────────────────────
function AnalysisCard({ reportId, brandId, analysis, generatedAt }: {
  reportId: number;
  brandId: number;
  analysis: string | null;
  generatedAt: string | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showContext, setShowContext] = useState(false);
  const [monthlyContext, setMonthlyContext] = useState("");
  const [businessFocus, setBusinessFocus] = useState("");
  const [managerNotes, setManagerNotes] = useState("");

  const { mutate: generate, isPending } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/reports/${reportId}/analyze`, {
        method: "POST",
        headers: { "x-brand-id": String(brandId), "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          monthly_context: monthlyContext.trim() || undefined,
          business_focus: businessFocus.trim() || undefined,
          manager_notes: managerNotes.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error("Failed to generate analysis");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-detail", reportId] });
    },
    onError: () => toast({ title: "Analysis failed", description: "Could not generate analysis. Try again.", variant: "destructive" }),
  });

  const inputCls = "w-full text-[12px] text-[#18181B] bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg px-3 py-2 placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA] resize-none";

  return (
    <div className={cn(card, "p-4 space-y-3")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <h2 className="text-[12px] font-semibold text-[#3F3F46] uppercase tracking-wide">AI Analysis</h2>
          {generatedAt && (
            <span className="text-[10px] text-[#A1A1AA]">
              Generated {new Date(generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowContext((v) => !v)}
            className="text-[11px] text-[#A1A1AA] hover:text-[#3F3F46] transition-colors"
          >
            {showContext ? "Hide context" : "Add context"}
          </button>
          <button
            onClick={() => generate()}
            disabled={isPending}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors",
              isPending
                ? "border-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed"
                : "border-[#E4E4E7] text-[#3F3F46] hover:border-[#A1A1AA] hover:text-[#18181B]",
            )}
          >
            {isPending ? (
              <><span className="w-3 h-3 border border-[#A1A1AA] border-t-transparent rounded-full animate-spin" />{analysis ? "Regenerating…" : "Generating…"}</>
            ) : (
              <>{analysis ? "Regenerate" : "Generate analysis"}</>
            )}
          </button>
        </div>
      </div>

      {showContext && (
        <div className="space-y-2 border-t border-[#F4F4F5] pt-3">
          <p className="text-[11px] text-[#A1A1AA]">Optional context — helps the AI write a more specific analysis.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wide block mb-1">Campaigns / seasonal context</label>
              <textarea rows={2} value={monthlyContext} onChange={(e) => setMonthlyContext(e.target.value)} placeholder="e.g. Easter promotion, school holidays" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wide block mb-1">Business focus this month</label>
              <textarea rows={2} value={businessFocus} onChange={(e) => setBusinessFocus(e.target.value)} placeholder="e.g. Drive bookings for summer routes" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wide block mb-1">Notes from social media manager</label>
              <textarea rows={2} value={managerNotes} onChange={(e) => setManagerNotes(e.target.value)} placeholder="e.g. We tried short-form video for the first time" className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {analysis ? (
        <div className="text-[13px] text-[#3F3F46] leading-relaxed whitespace-pre-wrap border-t border-[#F4F4F5] pt-3">{analysis}</div>
      ) : (
        <p className="text-[12px] text-[#A1A1AA] italic">
          No analysis yet — click "Generate analysis" to get an AI summary of this month's performance.
        </p>
      )}
    </div>
  );
}

// ─── Audience growth card ─────────────────────────────────────────────────────
function AudienceGrowthCard({ reportId, brandId, summary, prevSummary }: {
  reportId: number;
  brandId: number;
  summary: ReportSummary | null;
  prevSummary: ReportSummary | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [totalFollowers, setTotalFollowers] = useState("");

  const openEdit = () => {
    setTotalFollowers(summary?.page_total_followers != null ? String(summary.page_total_followers) : "");
    setEditing(true);
  };

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${API}/api/reports/${reportId}/audience`, {
        method: "PATCH",
        headers: { "x-brand-id": String(brandId), "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          page_total_followers: totalFollowers !== "" ? Number(totalFollowers) : null,
        }),
      });
      if (!r.ok) throw new Error("Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-detail", reportId] });
      setEditing(false);
    },
    onError: () => toast({ title: "Save failed", description: "Could not update audience data.", variant: "destructive" }),
  });

  const hasPageData = summary?.page_total_followers != null;
  if (!hasPageData && !editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <h2 className="text-[12px] font-semibold text-[#3F3F46] uppercase tracking-wide">Audience Growth</h2>
        </div>
        <div className={cn(card, "p-4 flex items-center justify-between gap-3")}>
          <p className="text-[12px] text-[#A1A1AA] italic">No follower data — enter this month's total followers from the Facebook Audience Overview.</p>
          <button onClick={openEdit} className="text-[11px] text-[#3F3F46] border border-[#E4E4E7] rounded-lg px-3 py-1.5 hover:border-[#A1A1AA] transition-colors whitespace-nowrap">Add data</button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full text-[12px] text-[#18181B] bg-[#FAFAFA] border border-[#E4E4E7] rounded-lg px-3 py-2 placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#A1A1AA]";

  const MoMDelta = ({ cur, prev }: { cur: number | null; prev: number | null }) => {
    if (cur == null || prev == null) return null;
    const delta = cur - prev;
    const up = delta >= 0;
    const pct = prev > 0 ? ((delta / prev) * 100).toFixed(1) : null;
    return (
      <div className={cn("text-[11px] font-medium mt-0.5", up ? "text-emerald-600" : "text-red-500")}>
        {up ? "+" : ""}{delta.toLocaleString()}{pct ? ` (${up ? "+" : ""}${pct}%)` : ""} vs last month
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserPlus className="w-3.5 h-3.5 text-[#A1A1AA]" />
          <h2 className="text-[12px] font-semibold text-[#3F3F46] uppercase tracking-wide">Audience Growth</h2>
        </div>
        {!editing && (
          <button onClick={openEdit} className="text-[11px] text-[#A1A1AA] hover:text-[#3F3F46] transition-colors">
            {hasPageData ? "Edit" : "Add data"}
          </button>
        )}
      </div>

      {editing ? (
        <div className={cn(card, "p-4 space-y-4")}>
          <p className="text-[11px] text-[#A1A1AA]">Enter figures from the Facebook Audience Overview for this month.</p>
          <div className="max-w-[200px]">
            <label className="text-[10px] font-medium text-[#71717A] uppercase tracking-wide block mb-1">Total Followers</label>
            <input type="number" value={totalFollowers} onChange={(e) => setTotalFollowers(e.target.value)} placeholder="e.g. 102486" className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => save()} disabled={isPending} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#18181B] text-white hover:bg-[#3F3F46] disabled:opacity-50 transition-colors">
              {isPending ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-[11px] px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[#3F3F46] hover:border-[#A1A1AA] transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className={cn(card, "p-4")}>
          {summary?.page_total_followers != null ? (() => {
            const cur = summary.page_total_followers!;
            const prev = prevSummary?.page_total_followers ?? null;
            const delta = prev != null ? cur - prev : null;
            const up = delta != null ? delta >= 0 : true;
            return (
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wide font-medium mb-1">Total Followers</div>
                  <div className="text-[32px] font-semibold text-[#18181B] leading-none">{cur.toLocaleString()}</div>
                </div>
                {delta != null && (
                  <div className={cn(
                    "flex items-center gap-1 text-[15px] font-semibold pb-0.5",
                    up ? "text-emerald-600" : "text-red-500"
                  )}>
                    {up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {up ? "+" : ""}{delta.toLocaleString()}
                    <span className="text-[11px] font-normal text-[#A1A1AA] ml-1">vs last month</span>
                  </div>
                )}
              </div>
            );
          })() : (
            <p className="text-[12px] text-[#A1A1AA] italic">No follower data yet — click Edit to add.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Report detail view ───────────────────────────────────────────────────────
function ReportDetail({ reportId, onBack, brandId }: { reportId: number; onBack: () => void; brandId: number }) {
  const { data, isLoading } = useQuery<ReportDetail>({
    queryKey: ["report-detail", reportId],
    queryFn: async () => {
      const r = await fetch(`${API}/api/reports/${reportId}`, {
        headers: { "x-brand-id": String(brandId) },
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to load report");
      return r.json();
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-[#A1A1AA] text-sm">Loading report…</div>
  );
  if (!data) return null;

  const { report, summary, posts, topPosts, bottomPosts, prevSummary, prevMonth } = data;
  const PlatIcon = report.platform === "Facebook" ? Facebook : Instagram;
  const platColor = report.platform === "Facebook" ? "text-[#1877F2]" : "text-[#E1306C]";

  const totalEng = (summary?.total_likes ?? 0) + (summary?.total_comments ?? 0) + (summary?.total_shares ?? 0) + (summary?.total_saves ?? 0);
  const prevTotalEng = prevSummary
    ? (prevSummary.total_likes ?? 0) + (prevSummary.total_comments ?? 0) + (prevSummary.total_shares ?? 0) + (prevSummary.total_saves ?? 0)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[#71717A] hover:text-[#18181B] text-[12px] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> All reports
        </button>
      </div>

      <div className="flex items-center gap-3">
        <PlatIcon className={cn("w-5 h-5", platColor)} />
        <div>
          <h1 className="text-[18px] font-semibold text-[#18181B] tracking-[-0.01em]">{report.label ?? monthLabel(report.month)}</h1>
          <p className="text-[12px] text-[#A1A1AA]">{report.post_count} posts · Uploaded {new Date(report.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard label="Posts" value={String(summary.total_posts)} icon={CalendarDays} />
          <StatCard label="Total Views" value={fmt(summary.total_views)} icon={Eye} />
          <StatCard label="Reach" value={fmt(summary.total_reach)} icon={Users} />
          <StatCard label="Engagement Rate" value={fmtEngRate(summary.engagement_rate)} icon={TrendingUp} sub="(likes+cmts+shares+saves)/reach" />
          <StatCard label="Likes / Reactions" value={fmt(summary.total_likes)} icon={Heart} />
          <StatCard label="Comments" value={fmt(summary.total_comments)} icon={MessageCircle} />
          <StatCard label="Shares" value={fmt(summary.total_shares)} icon={Share2} />
          {summary.total_saves !== null && (
            <StatCard label="Saves" value={fmt(summary.total_saves)} icon={TrendingUp} />
          )}
          {summary.total_link_clicks !== null && (
            <StatCard label="Link Clicks" value={fmt(summary.total_link_clicks)} icon={ExternalLink} />
          )}
          <StatCard label="Total Engagement" value={fmt(totalEng)} icon={TrendingUp} />
        </div>
      )}

      {/* Month-over-month comparison */}
      {summary && prevSummary && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#A1A1AA]" />
            <h2 className="text-[12px] font-semibold text-[#3F3F46] uppercase tracking-wide">vs {monthLabel(prevMonth)}</h2>
            <span className="text-[11px] text-[#A1A1AA]">— month-over-month</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <DeltaCard label="Views" current={summary.total_views} previous={prevSummary.total_views} icon={Eye} />
            <DeltaCard label="Reach" current={summary.total_reach} previous={prevSummary.total_reach} icon={Users} />
            <DeltaCard label="Eng. Rate" current={summary.engagement_rate != null ? parseFloat(summary.engagement_rate) : null} previous={prevSummary.engagement_rate != null ? parseFloat(prevSummary.engagement_rate) : null} icon={TrendingUp} isRate />
            <DeltaCard label="Total Engagement" current={totalEng} previous={prevTotalEng} icon={Heart} />
            <DeltaCard label="Likes / Reactions" current={summary.total_likes} previous={prevSummary.total_likes} icon={Heart} />
            <DeltaCard label="Comments" current={summary.total_comments} previous={prevSummary.total_comments} icon={MessageCircle} />
            <DeltaCard label="Shares" current={summary.total_shares} previous={prevSummary.total_shares} icon={Share2} />
            {summary.total_saves !== null && prevSummary.total_saves !== null && (
              <DeltaCard label="Saves" current={summary.total_saves} previous={prevSummary.total_saves} icon={TrendingUp} />
            )}
            {summary.total_link_clicks !== null && prevSummary.total_link_clicks !== null && (
              <DeltaCard label="Link Clicks" current={summary.total_link_clicks} previous={prevSummary.total_link_clicks} icon={ExternalLink} />
            )}
            <DeltaCard label="Posts" current={summary.total_posts} previous={prevSummary.total_posts} icon={CalendarDays} />
          </div>
        </div>
      )}

      {/* Audience growth */}
      <AudienceGrowthCard reportId={reportId} brandId={brandId} summary={summary} prevSummary={prevSummary ?? null} />

      {/* Best day / time */}
      {summary && (summary.best_day_of_week || summary.best_hour_of_day !== null) && (
        <div className={cn(card, "p-4 flex items-center gap-6")}>
          <Clock className="w-4 h-4 text-[#A1A1AA] flex-shrink-0" />
          <div className="flex gap-8">
            {summary.best_day_of_week && (
              <div>
                <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wide font-medium mb-0.5">Best day</div>
                <div className="text-[14px] font-semibold text-[#18181B]">{summary.best_day_of_week}</div>
              </div>
            )}
            {summary.best_hour_of_day !== null && (
              <div>
                <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wide font-medium mb-0.5">Best time</div>
                <div className="text-[14px] font-semibold text-[#18181B]">{fmtHour(summary.best_hour_of_day)}</div>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[#A1A1AA] ml-auto">Based on average views per publish time</p>
        </div>
      )}

      {/* AI Analysis */}
      {summary && (
        <AnalysisCard
          reportId={report.id}
          brandId={brandId}
          analysis={summary.ai_analysis ?? null}
          generatedAt={summary.ai_analysis_generated_at ?? null}
        />
      )}

      {/* Top posts */}
      {topPosts.length > 0 && (
        <div className={card}>
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[#F4F4F5]">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="text-[13px] font-semibold text-[#18181B]">Top Performing Posts</h2>
          </div>
          {topPosts.map((p, i) => <PostRow key={p.id} post={p} rank={i + 1} highlight="top" />)}
        </div>
      )}

      {/* Bottom posts */}
      {bottomPosts.length > 0 && (
        <div className={card}>
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[#F4F4F5]">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <h2 className="text-[13px] font-semibold text-[#18181B]">Lowest Performing Posts</h2>
          </div>
          {bottomPosts.map((p, i) => <PostRow key={p.id} post={p} rank={i + 1} highlight="bottom" />)}
        </div>
      )}

      {/* All posts */}
      <div className={card}>
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-[#F4F4F5]">
          <BarChart2 className="w-4 h-4 text-[#A1A1AA]" />
          <h2 className="text-[13px] font-semibold text-[#18181B]">All Posts ({posts.length})</h2>
        </div>
        {posts.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-[#A1A1AA]">No posts found</div>
        )}
        {[...posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).map((p) => (
          <PostRow key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

// ─── Upload panel ─────────────────────────────────────────────────────────────
function UploadPanel({ brandId, onUploaded }: { brandId: number; onUploaded: (id: number) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [platform, setPlatform] = useState<"Facebook" | "Instagram">("Facebook");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async ({ csv, filename }: { csv: string; filename: string }) => {
      const r = await fetch(`${API}/api/reports/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-brand-id": String(brandId) },
        credentials: "include",
        body: JSON.stringify({ platform, csv, filename }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }
      return r.json() as Promise<{ reportId: number; month: string; postCount: number }>;
    },
    onSuccess: (data) => {
      toast({ title: "Report uploaded", description: `${data.postCount} posts ingested for ${data.month}` });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setFileName(null);
      onUploaded(data.reportId);
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      mutation.mutate({ csv, filename: file.name });
    };
    reader.readAsText(file);
  }, [mutation, toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className={cn(card, "p-5 space-y-4")}>
      <div className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-[#A1A1AA]" />
        <h2 className="text-[13px] font-semibold text-[#18181B]">Upload Report</h2>
      </div>

      {/* Platform selector */}
      <div className="flex gap-2">
        {(["Facebook", "Instagram"] as const).map((p) => {
          const Icon = p === "Facebook" ? Facebook : Instagram;
          const color = p === "Facebook" ? "text-[#1877F2]" : "text-[#E1306C]";
          return (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all",
                platform === p
                  ? "border-[#18181B] bg-[#18181B] text-white"
                  : "border-[#E4E4E7] text-[#71717A] hover:border-[#A1A1AA]",
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", platform === p ? "text-white" : color)} />
              {p}
            </button>
          );
        })}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-all",
          dragging ? "border-[#18181B] bg-[#FAFAFA]" : "border-[#E4E4E7] hover:border-[#A1A1AA] hover:bg-[#FAFAFA]",
          mutation.isPending && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="w-6 h-6 text-[#A1A1AA]" />
        <p className="text-[13px] text-[#3F3F46] font-medium text-center">
          {mutation.isPending ? "Processing…" : "Drop CSV here or click to browse"}
        </p>
        <p className="text-[11px] text-[#A1A1AA] text-center">Export directly from Meta Business Suite · {platform} format</p>
        {fileName && !mutation.isPending && (
          <span className="text-[11px] text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded">{fileName}</span>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      <div className={cn(card, "p-3 flex gap-2")}>
        <AlertCircle className="w-3.5 h-3.5 text-[#A1A1AA] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#71717A] leading-relaxed">
          Upload the CSV exported from Meta Business Suite &rarr; Content &rarr; Posts. If a report for the same month and platform already exists, it will be replaced. Posts are auto-linked to the content calendar by URL.
        </p>
      </div>
    </div>
  );
}

// ─── Report list card ─────────────────────────────────────────────────────────
function ReportCard({ report, onOpen, onDelete, brandId }: { report: Report; onOpen: () => void; onDelete: () => void; brandId: number }) {
  const PlatIcon = report.platform === "Facebook" ? Facebook : Instagram;
  const platColor = report.platform === "Facebook" ? "text-[#1877F2]" : "text-[#E1306C]";

  return (
    <div className={cn(card, "p-4 flex items-center gap-4 hover:border-[#E4E4E7] transition-colors cursor-pointer group")} onClick={onOpen}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", report.platform === "Facebook" ? "bg-blue-50" : "bg-pink-50")}>
        <PlatIcon className={cn("w-4 h-4", platColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-[#18181B]">{report.label ?? monthLabel(report.month)}</div>
        <div className="text-[11px] text-[#A1A1AA]">{report.post_count} posts · {new Date(report.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-rose-500 hover:bg-rose-50 transition-colors"
          title="Delete report"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <ChevronRight className="w-4 h-4 text-[#A1A1AA] flex-shrink-0" />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PerformanceReports() {
  const { activeBrand } = useBrand();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const brandId = activeBrand?.id ?? 1;

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["reports", brandId],
    queryFn: async () => {
      const r = await fetch(`${API}/api/reports`, {
        headers: { "x-brand-id": String(brandId) },
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to load reports");
      return r.json();
    },
    enabled: !!activeBrand,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const r = await fetch(`${API}/api/reports/${id}`, {
        method: "DELETE",
        headers: { "x-brand-id": String(brandId) },
        credentials: "include",
      });
      if (!r.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Report deleted" });
      qc.invalidateQueries({ queryKey: ["reports"] });
      if (selectedId !== null) setSelectedId(null);
    },
    onError: () => toast({ title: "Failed to delete report", variant: "destructive" }),
  });

  if (selectedId !== null) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ReportDetail
          reportId={selectedId}
          brandId={brandId}
          onBack={() => setSelectedId(null)}
        />
      </div>
    );
  }

  const fbReports = reports.filter((r) => r.platform === "Facebook").sort((a, b) => b.month.localeCompare(a.month));
  const igReports = reports.filter((r) => r.platform === "Instagram").sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-[#A1A1AA]" />
          <div>
            <h1 className="text-[18px] font-semibold text-[#18181B] tracking-[-0.01em]">Performance Reports</h1>
            <p className="text-[12px] text-[#A1A1AA]">Monthly Facebook &amp; Instagram analytics</p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all",
            showUpload
              ? "border-[#18181B] bg-[#18181B] text-white"
              : "border-[#E4E4E7] text-[#3F3F46] hover:border-[#A1A1AA]",
          )}
        >
          {showUpload ? <X className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
          {showUpload ? "Close" : "Upload Report"}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          brandId={brandId}
          onUploaded={(id) => { setShowUpload(false); setSelectedId(id); }}
        />
      )}

      {/* Empty state */}
      {!isLoading && reports.length === 0 && !showUpload && (
        <div className={cn(card, "p-12 flex flex-col items-center gap-3 text-center")}>
          <BarChart2 className="w-8 h-8 text-[#E4E4E7]" />
          <p className="text-[14px] font-medium text-[#3F3F46]">No reports yet</p>
          <p className="text-[12px] text-[#A1A1AA] max-w-xs">Upload a Facebook or Instagram CSV export from Meta Business Suite to get started.</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181B] text-white text-[12px] font-medium hover:bg-[#27272A] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload first report
          </button>
        </div>
      )}

      {/* Facebook reports */}
      {fbReports.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
            <h2 className="text-[12px] font-semibold text-[#3F3F46] uppercase tracking-wide">Facebook</h2>
          </div>
          {fbReports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              brandId={brandId}
              onOpen={() => setSelectedId(r.id)}
              onDelete={() => deleteMutation.mutate(r.id)}
            />
          ))}
        </div>
      )}

      {/* Instagram reports */}
      {igReports.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Instagram className="w-3.5 h-3.5 text-[#E1306C]" />
            <h2 className="text-[12px] font-semibold text-[#3F3F46] uppercase tracking-wide">Instagram</h2>
          </div>
          {igReports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              brandId={brandId}
              onOpen={() => setSelectedId(r.id)}
              onDelete={() => deleteMutation.mutate(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
