import { useEffect, useState } from "react";
import { SkipForward, Loader2, ExternalLink, RotateCcw, Trash2, Facebook, Instagram, Globe, CalendarPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SkippedPost {
  id: number;
  title: string | null;
  market: string;
  platform: string;
  pillar: string | null;
  format: string | null;
  caption: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: string;
  posted_url: string | null;
  posted_url_ig: string | null;
  link_url: string | null;
  drive_url: string | null;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function platformIcon(platform: string) {
  const lc = (platform ?? "").toLowerCase();
  if (lc === "both" || lc.includes("facebook")) return Facebook;
  if (lc.includes("instagram")) return Instagram;
  return Globe;
}

function platformColor(platform: string) {
  const lc = (platform ?? "").toLowerCase();
  if (lc === "both" || lc.includes("facebook")) return "text-[#1877F2]";
  if (lc.includes("instagram")) return "text-[#E1306C]";
  return "text-[#A1A1AA]";
}

export default function SkippedPosts() {
  const { activeBrand } = useBrand();
  const accent = activeBrand?.primaryColor ?? "#1e82b4";
  const [posts, setPosts] = useState<SkippedPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/content/posts/skipped`);
      const data = await r.json();
      setPosts(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [activeBrand?.slug]);

  async function unskip(id: number) {
    const prev = posts;
    setPosts(p => p.filter(x => x.id !== id));
    try {
      const r = await fetch(`${API}/api/content/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setPosts(prev);
      alert("Couldn't restore that post. Please try again.");
    }
  }

  async function reschedule(id: number, newDate: string) {
    setPosts(p => p.filter(x => x.id !== id));
    try {
      const r = await fetch(`${API}/api/content/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_date: newDate,
          month: newDate.slice(0, 7),
          status: "pending",
        }),
      });
      if (!r.ok) throw new Error();
    } catch {
      alert("Couldn't reschedule that post. Reloading the list.");
      void load();
    }
  }

  async function remove(id: number) {
    const prev = posts;
    setPosts(p => p.filter(x => x.id !== id));
    try {
      const r = await fetch(`${API}/api/content/posts/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
    } catch {
      setPosts(prev);
      alert("Couldn't delete that post. Please try again.");
    }
  }

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">
            <SkipForward className="w-3.5 h-3.5" />
            Calendar archive
          </div>
          <h1 className="text-3xl font-extrabold text-[#18181B] tracking-tight">Skipped Posts</h1>
          <p className="text-sm text-[#71717A] mt-1.5 max-w-xl">
            Posts you've put aside from the content calendar. They stay here for reference — restore them back to drafts or delete for good.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-[#E4E4E7] rounded-2xl">
            <SkipForward className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-[#71717A]">Nothing skipped — your calendar is tidy.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E4E4E7] bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F5F5] border-b border-[#E4E4E7]">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A] whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Channel</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Title / Caption</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Pillar</th>
                  <th className="px-4 py-3 w-32"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p, i) => {
                  const Plat = platformIcon(p.platform);
                  const isItalian = p.market === "Italian Market";
                  const link = p.link_url || p.drive_url || p.posted_url || p.posted_url_ig;
                  return (
                    <tr key={p.id} className={cn("border-b border-[#F4F4F5] last:border-0", i % 2 ? "bg-[#F5F5F5]/40" : "")}>
                      <td className="px-4 py-3 align-top text-[#52525B] whitespace-nowrap">{fmtDate(p.scheduled_date)}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <Plat className={cn("w-3.5 h-3.5", platformColor(p.platform))} />
                          <span className="text-xs font-semibold text-[#3F3F46] capitalize">{p.platform}</span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", isItalian ? "bg-[#1e82b4]/10 text-[#1e82b4]" : "bg-[#f6a610]/10 text-[#f6a610]")}>
                            {isItalian ? "IT" : "EN"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        {p.title?.trim() && <div className="font-semibold text-[#18181B] leading-snug">{p.title}</div>}
                        {p.caption?.trim() && (
                          <div className="text-xs text-[#71717A] mt-0.5 line-clamp-2 whitespace-pre-wrap">{p.caption}</div>
                        )}
                        {!p.title?.trim() && !p.caption?.trim() && <span className="text-xs text-gray-300 italic">No title or caption</span>}
                        {link && (
                          <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] mt-1.5 hover:underline" style={{ color: accent }}>
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-[#52525B]">{p.pillar || "—"}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center justify-end gap-1">
                          <RescheduleBtn
                            currentDate={p.scheduled_date}
                            onConfirm={(d) => reschedule(p.id, d)}
                          />
                          <button
                            onClick={() => unskip(p.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md text-[#52525B] hover:text-white hover:bg-gray-700 transition-colors"
                            title="Restore as draft (keeps current date)"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restore
                          </button>
                          <DeleteBtn onConfirm={() => remove(p.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RescheduleBtn({ currentDate, onConfirm }: { currentDate: string | null; onConfirm: (d: string) => void }) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string>(currentDate || today);

  if (open) {
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
    return (
      <div className="flex items-center gap-1 bg-[#F5F5F5] border border-[#E4E4E7] rounded-md px-1.5 py-1">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-[11px] bg-white border border-[#E4E4E7] rounded px-1.5 py-0.5 text-[#18181B] focus:outline-none focus:ring-2 ring-ring/70"
          autoFocus
        />
        <button
          onClick={() => valid && (onConfirm(date), setOpen(false))}
          disabled={!valid}
          className="text-[#39A15F] hover:bg-[#39A15F]/10 disabled:opacity-40 disabled:cursor-not-allowed p-1 rounded"
          title="Confirm new date"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setOpen(false); setDate(currentDate || today); }}
          className="text-[#A1A1AA] hover:text-[#52525B] p-1 rounded"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md text-[#52525B] hover:text-white hover:bg-gray-700 transition-colors"
      title="Pick a new date and move it back onto the calendar"
    >
      <CalendarPlus className="w-3 h-3" />
      Reschedule
    </button>
  );
}

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center gap-1">
        <button onClick={onConfirm} className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md">Delete</button>
        <button onClick={() => setConfirm(false)} className="text-[11px] text-[#A1A1AA] hover:text-[#52525B] px-1">Cancel</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors"
      title="Delete permanently"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
