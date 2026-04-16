import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocalMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BrandAgentChatHandle {
  setPrompt: (text: string) => void;
}

export const BrandAgentChat = forwardRef<BrandAgentChatHandle, Record<string, never>>(
  function BrandAgentChat(_, ref) {
    const [messages, setMessages] = useState<LocalMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      setPrompt(text: string) {
        setInput(text);
        setTimeout(() => {
          inputRef.current?.focus();
          const el = inputRef.current;
          if (el) el.setSelectionRange(el.value.length, el.value.length);
        }, 50);
      },
    }));

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [messages, isStreaming]);

    const sendMessage = async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const newMessages: LocalMessage[] = [...messages, { role: "user", content: text }];
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

        if (!res.body) throw new Error("No response body");

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
                    prev.map((m, i) =>
                      i === assistantIndex ? { ...m, content: accumulated } : m
                    )
                  );
                }
              } catch { /* ignore */ }
            }
          }
        }
      } catch {
        setMessages(prev =>
          prev.map((m, i) =>
            i === assistantIndex
              ? { ...m, content: "Something went wrong. Please try again." }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(input.trim());
    };

    return (
      <div className="flex flex-col h-[500px] bg-[#141414] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 bg-[#0d0d0d] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1e82b4]/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#1e82b4]" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Virtu Brand Agent</h3>
            <p className="text-xs text-white/50">Ask anything about tone, style, or content</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Bot className="w-12 h-12 mb-3 text-white/30" />
              <p className="text-sm">I'm your Virtu Ferries brand assistant.</p>
              <p className="text-xs mt-1">Use a shortcut above or ask me anything.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 shrink-0 rounded-full flex items-center justify-center",
                  msg.role === "user" ? "bg-white/10" : "bg-[#1e82b4]/20"
                )}>
                  {msg.role === "user" ? (
                    <User className="w-4 h-4 text-white/70" />
                  ) : (
                    <Bot className="w-4 h-4 text-[#1e82b4]" />
                  )}
                </div>
                <div className={cn(
                  "p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#1e82b4] text-white rounded-tr-none"
                    : "bg-white/5 text-white/90 rounded-tl-none border border-white/5"
                )}>
                  {msg.content || (isStreaming && i === messages.length - 1 ? (
                    <span className="flex items-center gap-1 h-5">
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                    </span>
                  ) : "")}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-[#0d0d0d]">
          <div className="relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask the brand agent..."
              className="w-full bg-[#141414] border-white/10 focus-visible:ring-[#1e82b4] text-white pr-12 rounded-xl h-11"
              disabled={isStreaming}
              data-testid="input-chat"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="absolute right-1 top-1 h-9 w-9 bg-transparent hover:bg-white/5 text-[#1e82b4] disabled:text-white/20"
              data-testid="button-send-chat"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
    );
  }
);
