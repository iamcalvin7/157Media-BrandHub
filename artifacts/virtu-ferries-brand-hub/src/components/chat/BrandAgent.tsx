import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateConversation, 
  useListConversations, 
  useGetConversation,
  getGetConversationQueryKey
} from "@workspace/api-client-react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocalMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
}

export interface BrandAgentChatHandle {
  setPrompt: (text: string) => void;
}

export const BrandAgentChat = forwardRef<BrandAgentChatHandle, Record<string, never>>(
  function BrandAgentChat(_, ref) {
    const queryClient = useQueryClient();
    const { data: conversations } = useListConversations();
    const createConversation = useCreateConversation();

    const [activeConvId, setActiveConvId] = useState<number | null>(null);
    const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
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
      if (conversations && conversations.length > 0 && !activeConvId) {
        setActiveConvId(conversations[0].id);
      }
    }, [conversations, activeConvId]);

    const { data: conversationData } = useGetConversation(activeConvId as number, {
      query: { enabled: !!activeConvId }
    });

    useEffect(() => {
      if (conversationData) {
        setLocalMessages(conversationData.messages);
      }
    }, [conversationData]);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [localMessages, isStreaming]);

    const sendMessage = async (text: string) => {
      if (!text.trim() || isStreaming) return;

      setInput("");
      const tempUserMsgId = Date.now();
      setLocalMessages(prev => [...prev, { id: tempUserMsgId, role: "user", content: text }]);
      setIsStreaming(true);
      let currentConvId = activeConvId;

      try {
        if (!currentConvId) {
          const newConv = await createConversation.mutateAsync({
            data: { title: text.substring(0, 40) }
          });
          currentConvId = newConv.id;
          setActiveConvId(newConv.id);
          queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
        }

        const tempAsstMsgId = Date.now() + 1;
        setLocalMessages(prev => [...prev, { id: tempAsstMsgId, role: "assistant", content: "" }]);

        const response = await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text })
        });

        if (!response.ok) throw new Error(`Failed: ${response.statusText}`);
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.length > 6) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) {
                  queryClient.invalidateQueries({
                    queryKey: getGetConversationQueryKey(currentConvId)
                  });
                  break;
                }
                if (data.content) {
                  assistantContent += data.content;
                  setLocalMessages(prev =>
                    prev.map(msg =>
                      msg.id === tempAsstMsgId
                        ? { ...msg, content: assistantContent }
                        : msg
                    )
                  );
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } catch {
        setLocalMessages(prev => [...prev, {
          id: Date.now(),
          role: "assistant",
          content: "I encountered an error. Please try again."
        }]);
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

        <div
          ref={scrollRef}
          className="flex-1 p-4 overflow-y-auto space-y-4"
        >
          {localMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
              <Bot className="w-12 h-12 mb-3 text-white/30" />
              <p className="text-sm">I'm your Virtu Ferries brand assistant.</p>
              <p className="text-xs mt-1">Use a shortcut above or ask me anything.</p>
            </div>
          ) : (
            localMessages.map((msg, i) => (
              <div
                key={msg.id}
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
                  {msg.content || (isStreaming && i === localMessages.length - 1 ? (
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
