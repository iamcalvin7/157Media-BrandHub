import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Bot, User, Send, Loader2, Upload, CheckCircle2,
  AlertCircle, XCircle, Copy, Check, RotateCcw,
  Link as LinkIcon, TrendingUp, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  { value: "english-facebook", label: "English — Facebook (Virtu Ferries)" },
  { value: "italian-facebook", label: "Italian — Facebook (Le Vacanze Maltesi)" },
  { value: "italian-instagram", label: "Italian — Instagram (@virtuferrieslimited)" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Verdict {
  verdict: "On Brand" | "Needs Work" | "Off Brand";
  explanation: string;
  suggestions: string[];
  rewrite: string;
  tone_notes: string;
}

// ─── Chat Tab ──────────────────────────────────────────────────────────────────

function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantIndex = newMessages.length;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/openai/brand-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                accumulated += data.content;
                setMessages(prev =>
                  prev.map((m, i) => i === assistantIndex ? { ...m, content: accumulated } : m)
                );
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map((m, i) =>
          i === assistantIndex ? { ...m, content: "Something went wrong. Please try again." } : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }, [messages, isStreaming]);

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 gap-3">
            <Bot className="w-12 h-12 text-white/30" />
            <p className="text-sm text-white/60">Ask me anything — monthly plan, copy review, platform advice, trend adaptation.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-[#1e82b4]/20 flex items-center justify-center mt-0.5">
                  <Bot className="w-4 h-4 text-[#1e82b4]" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#1e82b4] text-white rounded-tr-none"
                    : "bg-[#141414] border border-white/8 text-white/90 rounded-tl-none"
                )}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-li:my-0.5 prose-headings:text-white prose-strong:text-white prose-code:text-[#f6a610] prose-table:text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : isStreaming && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1 h-5">
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                    </span>
                  ) : null
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center mt-0.5">
                  <User className="w-4 h-4 text-white/70" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-white/8">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input.trim());
              }
            }}
            placeholder="Ask the brand agent anything… (Shift+Enter for new line)"
            className="flex-1 min-h-[48px] max-h-[140px] resize-none bg-[#141414] border-white/10 focus-visible:ring-[#1e82b4] text-white rounded-xl text-sm"
            disabled={isStreaming}
          />
          <Button
            onClick={() => send(input.trim())}
            disabled={!input.trim() || isStreaming}
            className="h-12 w-12 shrink-0 bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-white rounded-xl"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="mt-2 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> New conversation
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Verdict Card ─────────────────────────────────────────────────────────────

function VerdictCard({ verdict }: { verdict: Verdict }) {
  const [copied, setCopied] = useState(false);

  const verdictConfig = {
    "On Brand": { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
    "Needs Work": { icon: AlertCircle, color: "text-[#f6a610]", bg: "bg-[#f6a610]/10 border-[#f6a610]/30" },
    "Off Brand": { icon: XCircle, color: "text-[#e01814]", bg: "bg-[#e01814]/10 border-[#e01814]/30" },
  }[verdict.verdict];

  const VerdictIcon = verdictConfig.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(verdict.rewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 mt-4"
    >
      <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold", verdictConfig.bg, verdictConfig.color)}>
        <VerdictIcon className="w-4 h-4" />
        {verdict.verdict}
      </div>

      <div className="p-5 bg-[#141414] border border-white/8 rounded-2xl">
        <p className="text-sm text-white/80 leading-relaxed">{verdict.explanation}</p>
      </div>

      {verdict.suggestions.length > 0 && (
        <div className="p-5 bg-[#141414] border border-white/8 rounded-2xl space-y-3">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Suggestions</p>
          <ul className="space-y-2">
            {verdict.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-white/75">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e82b4] mt-1.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {verdict.rewrite && (
        <div className="p-5 bg-[#141414] border border-white/8 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Rewritten Version</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{verdict.rewrite}</p>
        </div>
      )}

      {verdict.tone_notes && (
        <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
          <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1.5">Tone Notes</p>
          <p className="text-sm text-white/60 leading-relaxed">{verdict.tone_notes}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Copy Review Tab ──────────────────────────────────────────────────────────

function CopyReviewPanel() {
  const [copy, setCopy] = useState("");
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!copy.trim() || !platform || loading) return;
    setLoading(true);
    setVerdict(null);
    setError("");

    try {
      const res = await fetch("/api/openai/social-expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setVerdict(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/70">Paste your copy</label>
        <Textarea
          value={copy}
          onChange={e => setCopy(e.target.value)}
          placeholder="Paste the caption, headline, or copy you want reviewed…"
          className="min-h-[140px] bg-[#141414] border-white/10 focus-visible:ring-[#1e82b4] text-white rounded-xl text-sm resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">Platform</label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-[#141414] border-white/10 text-white focus:ring-[#1e82b4] rounded-xl">
            <SelectValue placeholder="Select platform…" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-white/10 text-white">
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value} className="focus:bg-[#1e82b4]/20 focus:text-white">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!copy.trim() || !platform || loading}
        className="w-full bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-white rounded-xl h-11"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Reviewing…</> : "Review Copy"}
      </Button>

      {error && (
        <div className="p-4 bg-[#e01814]/10 border border-[#e01814]/30 rounded-xl text-sm text-[#e01814]">{error}</div>
      )}

      {verdict && <VerdictCard verdict={verdict} />}
    </div>
  );
}

// ─── Image Review Tab ─────────────────────────────────────────────────────────

function ImageReviewPanel() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [platform, setPlatform] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setImageBase64(result);
      setVerdict(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!imageBase64 || !platform || loading) return;
    setLoading(true);
    setVerdict(null);
    setError("");

    try {
      const res = await fetch("/api/openai/social-expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setVerdict(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/70">Upload image</label>
        <div
          className={cn(
            "border-2 border-dashed rounded-2xl transition-colors cursor-pointer",
            preview ? "border-white/10" : "border-white/10 hover:border-[#1e82b4]/50"
          )}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) handleFile(file);
          }}
        >
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-2xl" />
              <button
                onClick={e => { e.stopPropagation(); setPreview(null); setImageBase64(null); setVerdict(null); }}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <Upload className="w-8 h-8 text-white/30" />
              <p className="text-sm text-white/50">Drop an image here, or click to browse</p>
              <p className="text-xs text-white/30">JPEG, PNG, WebP, GIF</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">Platform</label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-[#141414] border-white/10 text-white focus:ring-[#1e82b4] rounded-xl">
            <SelectValue placeholder="Select platform…" />
          </SelectTrigger>
          <SelectContent className="bg-[#141414] border-white/10 text-white">
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value} className="focus:bg-[#1e82b4]/20 focus:text-white">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!imageBase64 || !platform || loading}
        className="w-full bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-white rounded-xl h-11"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Reviewing…</> : "Review Image"}
      </Button>

      {error && (
        <div className="p-4 bg-[#e01814]/10 border border-[#e01814]/30 rounded-xl text-sm text-[#e01814]">{error}</div>
      )}

      {verdict && <VerdictCard verdict={verdict} />}
    </div>
  );
}

// ─── Trend Adaptation Panel ───────────────────────────────────────────────────

interface TrendIdea {
  concept: string;
  why: string;
  market: string;
  platform: string;
}

interface TrendResult {
  mechanic: string;
  fit: boolean;
  fit_reason: string;
  ideas: TrendIdea[];
}

const MARKET_LABELS: Record<string, string> = {
  english: "English Market",
  italian: "Italian Market",
  both: "Both Markets",
};

function TrendAdaptPanel() {
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrendResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const hasInput = description.trim() || link.trim() || imageBase64;

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const r = e.target?.result as string;
      setImageBase64(r);
      setImagePreview(r);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    setDescription("");
    setLink("");
    setImageBase64(null);
    setImagePreview(null);
    setResult(null);
    setError("");
  };

  const handleSubmit = async () => {
    if (!hasInput || loading) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/openai/trend-adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || undefined,
          link: link.trim() || undefined,
          imageBase64: imageBase64 || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <TrendingUp className="w-3.5 h-3.5" />
            Describe the trend
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what the trend is and how it works on social…"
            className="min-h-[90px] bg-[#141414] border-white/10 focus-visible:ring-[#1e82b4] text-white rounded-xl text-sm resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <LinkIcon className="w-3.5 h-3.5" />
            Paste a link
          </label>
          <Input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://…"
            className="bg-[#141414] border-white/10 focus-visible:ring-[#1e82b4] text-white rounded-xl h-11 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white/70">
            <Upload className="w-3.5 h-3.5" />
            Upload a screenshot
          </label>
          <div
            className="border-2 border-dashed border-white/10 hover:border-[#1e82b4]/40 rounded-2xl transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && file.type.startsWith("image/")) handleFile(file);
            }}
          >
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Screenshot" className="w-full max-h-48 object-contain rounded-2xl" />
                <button
                  onClick={e => { e.stopPropagation(); setImageBase64(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white/70 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <Upload className="w-6 h-6 text-white/20" />
                <p className="text-xs text-white/40">Drop screenshot here or click to browse</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!hasInput || loading}
          className="flex-1 bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-white rounded-xl h-11"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing…</> : <><Zap className="w-4 h-4 mr-2" /> Analyse & Adapt</>}
        </Button>
        {(hasInput || result) && (
          <Button
            variant="ghost"
            onClick={handleClear}
            className="h-11 px-5 text-white/50 hover:text-white border border-white/8 rounded-xl"
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-[#e01814]/10 border border-[#e01814]/30 rounded-xl text-sm text-[#e01814]">{error}</div>
      )}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
          {/* Trend Mechanic */}
          <div className="p-5 bg-[#141414] border border-white/8 rounded-2xl space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Trend Mechanic</p>
            <p className="text-sm text-white/80 leading-relaxed">{result.mechanic}</p>
          </div>

          {/* Fit Assessment */}
          <div className={cn(
            "p-5 rounded-2xl border space-y-2",
            result.fit
              ? "bg-emerald-400/5 border-emerald-400/20"
              : "bg-[#e01814]/5 border-[#e01814]/20"
          )}>
            <div className="flex items-center gap-2">
              {result.fit
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                : <XCircle className="w-4 h-4 text-[#e01814] shrink-0" />
              }
              <p className={cn(
                "text-xs uppercase tracking-widest font-semibold",
                result.fit ? "text-emerald-400" : "text-[#e01814]"
              )}>
                {result.fit ? "Fit Confirmed" : "Not a Fit"}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-white/70">{result.fit_reason}</p>
          </div>

          {/* Ideas */}
          {result.fit && result.ideas.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">Adapted Ideas</p>
              {result.ideas.map((idea, i) => (
                <div key={i} className="p-5 bg-[#141414] border border-white/8 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-[#1e82b4]/15 text-[#1e82b4] text-xs font-semibold border border-[#1e82b4]/20">
                      {MARKET_LABELS[idea.market] ?? idea.market}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/8">
                      {idea.platform}
                    </span>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">{idea.concept}</p>
                  <p className="text-xs text-white/45 italic border-t border-white/5 pt-3">{idea.why}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialMediaExpert() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto pb-24"
    >
      <header className="space-y-3 mb-10">
        <h1 className="font-serif text-4xl md:text-5xl text-white">Social Media Expert</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          Chat with the brand agent, review copy for brand fit, or check images against our guidelines.
        </p>
      </header>

      <Tabs defaultValue="chat">
        <TabsList className="bg-[#141414] border border-white/8 p-1 rounded-xl mb-8">
          <TabsTrigger
            value="chat"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-white text-white/60 font-medium"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="copy"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-white text-white/60 font-medium"
          >
            Copy Review
          </TabsTrigger>
          <TabsTrigger
            value="image"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-white text-white/60 font-medium"
          >
            Image Review
          </TabsTrigger>
          <TabsTrigger
            value="trend"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-white text-white/60 font-medium"
          >
            Trend Adapt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatPanel />
        </TabsContent>

        <TabsContent value="copy">
          <CopyReviewPanel />
        </TabsContent>

        <TabsContent value="image">
          <ImageReviewPanel />
        </TabsContent>

        <TabsContent value="trend">
          <TrendAdaptPanel />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
