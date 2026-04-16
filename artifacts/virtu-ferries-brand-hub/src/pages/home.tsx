import { useRef } from "react";
import { motion } from "framer-motion";
import { PenLine, Type, Compass, GraduationCap } from "lucide-react";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-screen overflow-hidden p-6 md:p-10 max-w-3xl mx-auto w-full"
    >
      <header className="shrink-0 mb-5">
        <h1 className="font-extrabold text-2xl text-gray-900">Brand Agent</h1>
        <p className="text-sm text-gray-400 mt-0.5">Ask anything about tone, copy, or brand guidelines.</p>
      </header>

      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => chatRef.current?.setPrompt(action.prompt)}
            className="group flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-[#1e82b4]/40 hover:bg-[#1e82b4]/5 transition-all duration-200 text-left"
          >
            <action.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1e82b4] shrink-0 transition-colors" />
            <span className="text-xs text-gray-500 group-hover:text-gray-800 transition-colors font-medium leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        <BrandAgentChat ref={chatRef} fullHeight />
      </div>
    </motion.div>
  );
}
