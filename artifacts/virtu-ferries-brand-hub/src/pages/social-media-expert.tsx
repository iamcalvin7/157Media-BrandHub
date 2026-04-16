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
            <Bot className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Ask me anything — monthly plan, copy review, platform advice, trend adaptation.</p>
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
                    ? "bg-[#1e82b4] text-gray-900 rounded-tr-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                )}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-li:my-0.5 prose-headings:text-gray-900 prose-strong:text-gray-900 prose-code:text-[#f6a610] prose-table:text-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : isStreaming && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1 h-5">
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-gray-1000 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-1000 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-1000 rounded-full" />
                    </span>
                  ) : null
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 shrink-0 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-gray-200">
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
            className="flex-1 min-h-[48px] max-h-[140px] resize-none bg-white border-gray-200 focus-visible:ring-[#1e82b4] text-gray-900 rounded-xl text-sm"
            disabled={isStreaming}
          />
          <Button
            onClick={() => send(input.trim())}
            disabled={!input.trim() || isStreaming}
            className="h-12 w-12 shrink-0 bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-gray-900 rounded-xl"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-300 hover:text-gray-500 transition-colors"
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

      <div className="p-5 bg-white border border-gray-200 rounded-2xl">
        <p className="text-sm text-gray-700 leading-relaxed">{verdict.explanation}</p>
      </div>

      {verdict.suggestions.length > 0 && (
        <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Suggestions</p>
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
        <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Rewritten Version</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{verdict.rewrite}</p>
        </div>
      )}

      {verdict.tone_notes && (
        <div className="p-4 bg-white/3 border border-gray-100 rounded-xl">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1.5">Tone Notes</p>
          <p className="text-sm text-gray-500 leading-relaxed">{verdict.tone_notes}</p>
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
        <label className="text-sm font-medium text-gray-600">Paste your copy</label>
        <Textarea
          value={copy}
          onChange={e => setCopy(e.target.value)}
          placeholder="Paste the caption, headline, or copy you want reviewed…"
          className="min-h-[140px] bg-white border-gray-200 focus-visible:ring-[#1e82b4] text-gray-900 rounded-xl text-sm resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600">Platform</label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:ring-[#1e82b4] rounded-xl">
            <SelectValue placeholder="Select platform…" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-gray-900">
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value} className="focus:bg-[#1e82b4]/20 focus:text-gray-900">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!copy.trim() || !platform || loading}
        className="w-full bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-gray-900 rounded-xl h-11"
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
        <label className="text-sm font-medium text-gray-600">Upload image</label>
        <div
          className={cn(
            "border-2 border-dashed rounded-2xl transition-colors cursor-pointer",
            preview ? "border-gray-200" : "border-gray-200 hover:border-[#1e82b4]/50"
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
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <Upload className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-400">Drop an image here, or click to browse</p>
              <p className="text-xs text-gray-300">JPEG, PNG, WebP, GIF</p>
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
        <label className="text-sm font-medium text-gray-600">Platform</label>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="bg-white border-gray-200 text-gray-900 focus:ring-[#1e82b4] rounded-xl">
            <SelectValue placeholder="Select platform…" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200 text-gray-900">
            {PLATFORMS.map(p => (
              <SelectItem key={p.value} value={p.value} className="focus:bg-[#1e82b4]/20 focus:text-gray-900">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!imageBase64 || !platform || loading}
        className="w-full bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-gray-900 rounded-xl h-11"
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
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <TrendingUp className="w-3.5 h-3.5" />
            Describe the trend
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what the trend is and how it works on social…"
            className="min-h-[90px] bg-white border-gray-200 focus-visible:ring-[#1e82b4] text-gray-900 rounded-xl text-sm resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <LinkIcon className="w-3.5 h-3.5" />
            Paste a link
          </label>
          <Input
            value={link}
            onChange={e => setLink(e.target.value)}
            placeholder="https://…"
            className="bg-white border-gray-200 focus-visible:ring-[#1e82b4] text-gray-900 rounded-xl h-11 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Upload className="w-3.5 h-3.5" />
            Upload a screenshot
          </label>
          <div
            className="border-2 border-dashed border-gray-200 hover:border-[#1e82b4]/40 rounded-2xl transition-colors cursor-pointer"
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
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-gray-600 hover:text-gray-900"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <Upload className="w-6 h-6 text-gray-300" />
                <p className="text-xs text-gray-400">Drop screenshot here or click to browse</p>
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
          className="flex-1 bg-[#1e82b4] hover:bg-[#1e82b4]/80 text-gray-900 rounded-xl h-11"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analysing…</> : <><Zap className="w-4 h-4 mr-2" /> Analyse & Adapt</>}
        </Button>
        {(hasInput || result) && (
          <Button
            variant="ghost"
            onClick={handleClear}
            className="h-11 px-5 text-gray-400 hover:text-gray-900 border border-gray-200 rounded-xl"
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
          <div className="p-5 bg-white border border-gray-200 rounded-2xl space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Trend Mechanic</p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.mechanic}</p>
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
            <p className="text-sm leading-relaxed text-gray-600">{result.fit_reason}</p>
          </div>

          {/* Ideas */}
          {result.fit && result.ideas.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Adapted Ideas</p>
              {result.ideas.map((idea, i) => (
                <div key={i} className="p-5 bg-white border border-gray-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full bg-[#1e82b4]/15 text-[#1e82b4] text-xs font-semibold border border-[#1e82b4]/20">
                      {MARKET_LABELS[idea.market] ?? idea.market}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
                      {idea.platform}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{idea.concept}</p>
                  <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-3">{idea.why}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Types shared by approval components ─────────────────────────────────────

interface ContentPost {
  id: number;
  market: string;
  platform: string;
  pillar: string;
  tone_register: string;
  format: string;
  caption: string;
  visual_direction: string;
  cta?: string | null;
  cross_post?: boolean | null;
  month: string;
  status: string;
}

interface Preferences {
  approved_patterns: { pillar: string; tone_register: string; format: string; market: string; count: number }[];
  rejected_patterns: { pillar: string; tone_register: string; format: string; market: string; count: number; reasons: string[] }[];
  active_constraints: string[];
  months_analysed: number;
}

// ─── Learning Summary Card ───────────────────────────────────────────────────

function LearningSummaryCard({ prefs, onDismiss }: { prefs: Preferences; onDismiss: () => void }) {
  if (prefs.months_analysed === 0 && prefs.approved_patterns.length === 0 && prefs.rejected_patterns.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 p-5 bg-[#1e82b4]/8 border border-[#1e82b4]/20 rounded-2xl space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#1e82b4] shrink-0" />
          <p className="text-sm font-semibold text-[#1e82b4]">
            Monthly Learning Summary · {prefs.months_analysed} month{prefs.months_analysed !== 1 ? "s" : ""} of data
          </p>
        </div>
        <button onClick={onDismiss} className="text-gray-300 hover:text-gray-600 transition-colors text-xs shrink-0">Dismiss</button>
      </div>

      {prefs.approved_patterns.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Consistently Approved</p>
          <ul className="space-y-1">
            {prefs.approved_patterns.slice(0, 5).map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{p.pillar} · {p.tone_register} · {p.format} <span className="text-gray-300">({p.market}, {p.count}×)</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prefs.rejected_patterns.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Consistently Rejected</p>
          <ul className="space-y-1">
            {prefs.rejected_patterns.slice(0, 5).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <XCircle className="w-3.5 h-3.5 text-[#e01814] shrink-0 mt-0.5" />
                <span>{p.pillar} · {p.tone_register} · {p.format} <span className="text-gray-300">— {p.reasons.slice(0, 2).join("; ")}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prefs.active_constraints.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <p className="text-xs text-[#f6a610] uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Active Constraints (3+ rejections)
          </p>
          <ul className="space-y-1">
            {prefs.active_constraints.map((c, i) => (
              <li key={i} className="text-sm text-gray-500 ml-5">· {c}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

// ─── Approval Queue Panel ─────────────────────────────────────────────────────

const PILLAR_LABEL: Record<string, string> = {
  why_vf: "Why VF",
  why_destination: "Why Destination",
  vf_recommends: "VF Recommends",
  vf_experience: "VF Experience",
};

function ApprovalQueuePanel() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [error, setError] = useState("");
  const [closingMonth, setClosingMonth] = useState(false);
  const [monthClosed, setMonthClosed] = useState(false);

  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/pending");
      const data = await res.json();
      setPosts(data);
      setIdx(0);
      setApproved(0);
      setRejected(0);
      setMonthClosed(false);
    } catch {
      setError("Failed to load pending posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const currentPost = posts[idx];
  const total = posts.length;
  const done = idx >= total && total > 0;
  const noPosts = !loading && total === 0 && !monthClosed;

  const advance = () => {
    setIdx((i) => i + 1);
    setRejectMode(false);
    setRejectReason("");
    setError("");
  };

  const handleApprove = async () => {
    if (!currentPost || actionLoading) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: currentPost.id }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      setApproved((n) => n + 1);
      advance();
    } catch {
      setError("Approval failed. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!currentPost || actionLoading || !rejectReason.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: currentPost.id, rejection_reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setRejected((n) => n + 1);
      advance();
    } catch {
      setError("Rejection failed. Try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseMonth = async () => {
    setClosingMonth(true);
    setError("");
    try {
      const res = await fetch("/api/content/close-month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: currentMonth }),
      });
      if (!res.ok) throw new Error("Failed to close month");
      setMonthClosed(true);
    } catch {
      setError("Failed to close month. Try again.");
    } finally {
      setClosingMonth(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (noPosts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <CheckCircle2 className="w-10 h-10 text-gray-200" />
        <p className="text-gray-400 text-sm">No pending posts for {currentMonth}.</p>
        <p className="text-gray-300 text-xs max-w-xs">Posts appear here after a monthly content plan is generated and submitted for review.</p>
      </div>
    );
  }

  if (monthClosed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <CheckCircle2 className="w-10 h-10 text-emerald-400/50" />
        <p className="text-gray-600 text-base font-medium">{currentMonth} closed</p>
        <p className="text-gray-400 text-sm">{approved} approved · {rejected} rejected · logged to changelog</p>
        <Button variant="ghost" onClick={fetchPending} className="mt-4 text-gray-400 hover:text-gray-900 border border-gray-200 rounded-xl h-10 px-5 text-sm">
          Check next month
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center py-10 text-center gap-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          <p className="text-gray-800 text-base font-medium">All posts reviewed</p>
          <p className="text-gray-400 text-sm">{approved} approved · {rejected} rejected</p>
        </div>
        {error && <div className="p-4 bg-[#e01814]/10 border border-[#e01814]/30 rounded-xl text-sm text-[#e01814]">{error}</div>}
        <Button
          onClick={handleCloseMonth}
          disabled={closingMonth}
          className="w-full bg-[#f6a610] hover:bg-[#f6a610]/80 text-black font-semibold rounded-xl h-12"
        >
          {closingMonth ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Closing…</> : "Close Month & Archive"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Post {idx + 1} of {total}</span>
        <span className="flex items-center gap-3">
          <span className="text-emerald-400">{approved} approved</span>
          <span className="text-[#e01814]">{rejected} rejected</span>
        </span>
      </div>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1e82b4] rounded-full transition-all"
          style={{ width: `${((idx) / total) * 100}%` }}
        />
      </div>

      {/* Post card */}
      {currentPost && (
        <motion.div
          key={currentPost.id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-2xl space-y-5"
        >
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#1e82b4]/15 text-[#1e82b4] text-xs font-semibold border border-[#1e82b4]/20 capitalize">
              {currentPost.market} Market
            </span>
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium border border-gray-200">
              {currentPost.platform.replace(/_/g, " ")}
            </span>
            {currentPost.cross_post && (
              <span className="px-2.5 py-1 rounded-full bg-[#f6a610]/10 text-[#f6a610] text-xs font-semibold border border-[#f6a610]/20">
                Cross-post ✓
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Pillar", value: PILLAR_LABEL[currentPost.pillar] ?? currentPost.pillar },
              { label: "Format", value: currentPost.format },
              { label: "Tone", value: currentPost.tone_register },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">{label}</p>
                <p className="text-sm text-gray-700">{value}</p>
              </div>
            ))}
          </div>

          {/* Caption */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">Caption</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{currentPost.caption}</p>
          </div>

          {/* Visual direction */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">Visual Direction</p>
            <p className="text-sm text-gray-500 leading-relaxed italic">{currentPost.visual_direction}</p>
          </div>

          {/* CTA */}
          {currentPost.cta && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-gray-300 font-semibold">CTA</p>
              <p className="text-sm text-gray-600">{currentPost.cta}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Error */}
      {error && <div className="p-4 bg-[#e01814]/10 border border-[#e01814]/30 rounded-xl text-sm text-[#e01814]">{error}</div>}

      {/* Reject reason input */}
      {rejectMode && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <Input
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && rejectReason.trim() && handleReject()}
            placeholder="Reason for rejection (required)…"
            autoFocus
            className="bg-white border-[#e01814]/30 focus-visible:ring-[#e01814] text-gray-900 rounded-xl h-11 text-sm"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
              className="flex-1 bg-[#e01814] hover:bg-[#e01814]/80 text-gray-900 rounded-xl h-10 text-sm"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
            </Button>
            <Button variant="ghost" onClick={() => { setRejectMode(false); setRejectReason(""); }}
              className="h-10 px-4 text-gray-400 hover:text-gray-900 border border-gray-200 rounded-xl text-sm">
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      {!rejectMode && (
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={actionLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-600/80 text-gray-900 rounded-xl h-12 font-semibold text-sm"
          >
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Approve</>}
          </Button>
          <Button
            onClick={() => setRejectMode(true)}
            disabled={actionLoading}
            variant="ghost"
            className="flex-1 border border-[#e01814]/30 text-[#e01814] hover:bg-[#e01814]/10 rounded-xl h-12 font-semibold text-sm"
          >
            <XCircle className="w-4 h-4 mr-2" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialMediaExpert() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [prefsDismissed, setPrefsDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/content/preferences")
      .then((r) => r.json())
      .then((data: Preferences) => setPrefs(data))
      .catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto pb-24"
    >
      <header className="space-y-3 mb-10">
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Social Media Expert</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          Chat with the brand agent, review copy for brand fit, or check images against our guidelines.
        </p>
      </header>

      {prefs && !prefsDismissed && (prefs.approved_patterns.length > 0 || prefs.rejected_patterns.length > 0 || prefs.active_constraints.length > 0) && (
        <LearningSummaryCard prefs={prefs} onDismiss={() => setPrefsDismissed(true)} />
      )}

      <Tabs defaultValue="chat">
        <TabsList className="bg-white border border-gray-200 p-1 rounded-xl mb-8 flex-wrap gap-1">
          <TabsTrigger
            value="chat"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-gray-900 text-gray-500 font-medium"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="copy"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-gray-900 text-gray-500 font-medium"
          >
            Copy Review
          </TabsTrigger>
          <TabsTrigger
            value="image"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-gray-900 text-gray-500 font-medium"
          >
            Image Review
          </TabsTrigger>
          <TabsTrigger
            value="trend"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-gray-900 text-gray-500 font-medium"
          >
            Trend Adapt
          </TabsTrigger>
          <TabsTrigger
            value="approval"
            className="rounded-lg data-[state=active]:bg-[#1e82b4] data-[state=active]:text-gray-900 text-gray-500 font-medium"
          >
            Approval Queue
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

        <TabsContent value="approval">
          <ApprovalQueuePanel />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
