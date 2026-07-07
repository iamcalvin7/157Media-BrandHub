import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { PenLine, Type, Compass, GraduationCap, Sparkles } from "lucide-react";
import { BrandAgentChat, BrandAgentChatHandle } from "@/components/chat/BrandAgent";
import { useBrand } from "@/lib/brand";

export default function Home() {
  const chatRef = useRef<BrandAgentChatHandle>(null);
  const { activeBrand } = useBrand();
  const brandName = activeBrand?.name ?? "this brand";

  const quickActions = useMemo(() => [
    {
      icon: PenLine,
      label: "Check my copy",
      hint: "Tone & voice review",
      prompt: "Please review this copy for brand tone and voice — let me know what works, what doesn't, and how to improve it:\n\n",
    },
    {
      icon: Type,
      label: "Write a caption",
      hint: "Instagram-ready",
      prompt: `Write an Instagram caption for ${brandName} about: `,
    },
    {
      icon: Compass,
      label: "Tone guidance",
      hint: "How should this sound?",
      prompt: "What's the right tone and approach for writing about: ",
    },
    {
      icon: GraduationCap,
      label: "Brand quiz",
      hint: "3 quick questions",
      prompt: `Quiz me on the ${brandName} brand guidelines. Ask me 3 questions one at a time and tell me if I'm right.`,
    },
  ], [brandName]);

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] overflow-hidden">
      {/* Ambient atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-70" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_110%,rgba(0,0,0,0.6),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col h-screen overflow-hidden p-6 md:p-10 max-w-4xl mx-auto w-full"
      >
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <header className="shrink-0 mb-7 space-y-4">
          <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#71717A]">
            <span className="h-1 w-1 rounded-full bg-[#39A15F] shadow-[0_0_8px_rgba(57,161,95,0.8)]" />
            Hub · {brandName}
          </span>

          <h1 className="h-hero-md text-[#18181B] max-w-2xl uppercase tracking-[-0.015em]">
            Your Brand,{" "}
            <span className="text-[#A1A1AA]">On Call.</span>
          </h1>

          <p className="text-[15px] text-[#A1A1AA] leading-relaxed max-w-xl font-light">
            Tone, copy, captions, guidelines. Ask anything — the agent ships with the full {brandName} knowledge baked in.
          </p>
        </header>

        {/* ─── Quick actions ────────────────────────────────────────────── */}
        <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.05 }}
              onClick={() => chatRef.current?.setPrompt(action.prompt)}
              className="group relative flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-[#FFFFFF] border border-[#E4E4E7] hover:border-[#D4D4D8] hover:bg-[#FAFAFA] transition-all duration-200 text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0"
              data-testid={`quick-action-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39A15F]/0 group-hover:via-[#39A15F]/50 to-transparent transition-all duration-500" />
              <div className="h-7 w-7 rounded-lg bg-[#FFFFFF] border border-[#E4E4E7] grid place-items-center shrink-0 group-hover:border-[#39A15F]/40 group-hover:bg-[#39A15F]/10 transition-colors">
                <action.icon className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[#39A15F] transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-[#18181B] font-semibold leading-tight tracking-[-0.005em]">
                  {action.label}
                </div>
                <div className="text-[11px] text-[#A1A1AA] group-hover:text-[#71717A] mt-0.5 transition-colors">
                  {action.hint}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* ─── Agent panel ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex-1 min-h-0 glass-dark overflow-hidden flex flex-col"
        >
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#8E8E96] font-semibold">
              <Sparkles className="w-3 h-3 text-[#39A15F]" />
              Brand Agent
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#39A15F] shadow-[0_0_6px_rgba(57,161,95,0.7)]" />
              Live
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <BrandAgentChat ref={chatRef} fullHeight />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
