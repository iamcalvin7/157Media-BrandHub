import { useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Image as ImageIcon, Share2, Lightbulb, Archive, Ship, PenLine, Type, Compass, GraduationCap } from "lucide-react";
import { BrandAgentChat, BrandAgentChatHandle } from "@/components/chat/BrandAgent";

const QUICK_ACTIONS = [
  {
    icon: PenLine,
    label: "Check my copy",
    prompt: "Please review this copy for brand tone and voice — let me know what works, what doesn't, and how to improve it:\n\n",
  },
  {
    icon: Type,
    label: "Write a caption",
    prompt: "Write an Instagram caption for Virtu Ferries about: ",
  },
  {
    icon: Compass,
    label: "Tone guidance",
    prompt: "What's the right tone and approach for writing about: ",
  },
  {
    icon: GraduationCap,
    label: "Brand quiz",
    prompt: "Quiz me on the Virtu Ferries brand guidelines. Ask me 3 questions one at a time and tell me if I'm right.",
  },
];

export default function Home() {
  const chatRef = useRef<BrandAgentChatHandle>(null);

  const cards = [
    { title: "Brand Identity", desc: "Tone, story, and key messages", href: "/brand-identity", icon: BookOpen },
    { title: "Assets", desc: "Logos, colours, and typography", href: "/assets", icon: ImageIcon },
    { title: "Social Media", desc: "Channels, pillars, and cadence", href: "/social-media", icon: Share2 },
    { title: "Content Ideas", desc: "AI-generated post concepts", href: "/content-ideas", icon: Lightbulb },
    { title: "Resources", desc: "Templates and guidelines", href: "/resources", icon: Archive },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-6xl mx-auto space-y-12"
    >
      <header className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e82b4]/10 text-[#1e82b4] text-xs font-semibold uppercase tracking-widest border border-[#1e82b4]/20">
          <Ship className="w-3.5 h-3.5" />
          Internal Tool
        </div>
        <h1 className="font-serif text-5xl md:text-6xl text-white">The Bridge Between Two Cultures</h1>
        <p className="text-lg text-white/60 leading-relaxed font-light max-w-2xl">
          Welcome to the Virtu Ferries Brand Hub. Everything you need to craft precise,
          editorially sharp content that bridges Malta and Sicily.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
          <h2 className="text-xl font-semibold text-white">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card, i) => (
              <Link key={i} href={card.href}>
                <div className="group block h-full p-6 bg-[#141414] border border-white/5 rounded-2xl hover:border-[#1e82b4]/50 hover:bg-[#141414]/80 transition-all duration-300 cursor-pointer relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#1e82b4]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full" />
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-[#1e82b4]/10 group-hover:text-[#1e82b4]">
                    <card.icon className="w-5 h-5 text-white/50 group-hover:text-[#1e82b4] transition-colors" />
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-1 group-hover:text-[#f6a610] transition-colors">{card.title}</h3>
                  <p className="text-sm text-white/50">{card.desc}</p>
                  <div className="absolute bottom-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 text-[#f6a610]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-xl font-semibold text-white">Ask the Brand Agent</h2>

          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => chatRef.current?.setPrompt(action.prompt)}
                className="group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#141414] border border-white/8 hover:border-[#1e82b4]/50 hover:bg-[#1e82b4]/5 transition-all duration-200 text-left"
              >
                <action.icon className="w-3.5 h-3.5 text-white/40 group-hover:text-[#1e82b4] shrink-0 transition-colors" />
                <span className="text-xs text-white/60 group-hover:text-white transition-colors font-medium leading-tight">
                  {action.label}
                </span>
              </button>
            ))}
          </div>

          <BrandAgentChat ref={chatRef} />
        </div>
      </div>
    </motion.div>
  );
}
