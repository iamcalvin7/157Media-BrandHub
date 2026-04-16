import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateConversation, 
  useListConversations, 
  useGetConversation,
  getGetConversationQueryKey
} from "@workspace/api-client-react";
import { Send, Loader2, Bot, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface LocalMessage {
  id: number | string;
  role: "user" | "assistant";
  content: string;
}

export function BrandAgentChat() {
  const queryClient = useQueryClient();
  const { data: conversations } = useListConversations();
  const createConversation = useCreateConversation();
  
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set initial conversation if exists
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations, activeConvId]);

  // Load messages for active conversation
  const { data: conversationData } = useGetConversation(activeConvId as number, {
    query: { enabled: !!activeConvId }
  });

  useEffect(() => {
    if (conversationData) {
      setLocalMessages(conversationData.messages);
    }
  }, [conversationData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, isStreaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput("");
    
    // Add optimistic user message
    const tempUserMsgId = Date.now();
    setLocalMessages(prev => [...prev, { id: tempUserMsgId, role: "user", content: userText }]);
    
    setIsStreaming(true);
    let currentConvId = activeConvId;

    try {
      // Create conversation if none exists
      if (!currentConvId) {
        const newConv = await createConversation.mutateAsync({ 
          data: { title: userText.substring(0, 40) } 
        });
        currentConvId = newConv.id;
        setActiveConvId(newConv.id);
        queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations"] });
      }

      // Add optimistic assistant message placeholder
      const tempAsstMsgId = Date.now() + 1;
      setLocalMessages(prev => [...prev, { id: tempAsstMsgId, role: "assistant", content: "" }]);

      // Implement SSE streaming
      const response = await fetch(`/api/chat/conversations/${currentConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userText })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ") && line.length > 6) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                // Refresh server state
                queryClient.invalidateQueries({ 
                  queryKey: getGetConversationQueryKey(currentConvId) 
                });
                break;
              }
              if (data.content) {
                assistantContent += data.content;
                // Update local state smoothly
                setLocalMessages(prev => 
                  prev.map(msg => 
                    msg.id === tempAsstMsgId 
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch (err) {
              console.error("Failed to parse SSE data:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      // Handle error visually if needed
      setLocalMessages(prev => [...prev, { 
        id: Date.now(), 
        role: "assistant", 
        content: "I'm sorry, I encountered an error processing your request. Please try again." 
      }]);
    } finally {
      setIsStreaming(false);
    }
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
            <p className="text-xs mt-1">Ask me to check copy, suggest ideas, or clarify guidelines.</p>
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
