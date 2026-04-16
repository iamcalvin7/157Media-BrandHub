import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListContentIdeas, 
  useGenerateContentIdeas,
  useDeleteContentIdea,
  getListContentIdeasQueryKey 
} from "@workspace/api-client-react";
import { Plus, Trash2, Loader2, Sparkles, Hash, Copy, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = ["Instagram", "Facebook", "LinkedIn", "X"];
const THEMES = ["The Crossing", "Malta", "Sicily", "Travel Tips", "People & Stories"];

export default function ContentIdeas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  const { data: ideas, isLoading } = useListContentIdeas({
    platform: filterPlatform !== "all" ? filterPlatform : undefined
  });
  
  const generateIdeas = useGenerateContentIdeas();
  const deleteIdea = useDeleteContentIdea();

  const [genPlatform, setGenPlatform] = useState(PLATFORMS[0]);
  const [genTheme, setGenTheme] = useState(THEMES[0]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await generateIdeas.mutateAsync({
        data: {
          platform: genPlatform,
          theme: genTheme,
          count: 3
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      setIsGenerateOpen(false);
      toast({
        title: "Ideas generated",
        description: "Successfully generated new content ideas.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate ideas. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteIdea.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] });
      toast({
        title: "Idea deleted",
        description: "Content idea removed successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete idea.",
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 pb-24"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <h1 className="font-serif text-4xl md:text-5xl text-white">Content Ideas</h1>
          <p className="text-lg text-white/60 font-light max-w-xl">
            AI-generated, on-brand content prompts based on our key pillars and platforms.
          </p>
        </div>
        
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e82b4] hover:bg-[#1e82b4]/90 text-white rounded-xl shadow-lg border border-[#1e82b4]" data-testid="button-open-generate">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Ideas
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#141414] border-white/10 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">Generate Content</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={genPlatform} onValueChange={setGenPlatform}>
                  <SelectTrigger className="bg-[#0d0d0d] border-white/10">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10 text-white">
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <Select value={genTheme} onValueChange={setGenTheme}>
                  <SelectTrigger className="bg-[#0d0d0d] border-white/10">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141414] border-white/10 text-white">
                    {THEMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#f6a610] hover:bg-[#f6a610]/90 text-black font-semibold rounded-xl"
                disabled={generateIdeas.isPending}
                data-testid="button-submit-generate"
              >
                {generateIdeas.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex gap-2 pb-2 overflow-x-auto">
        <Button 
          variant={filterPlatform === "all" ? "default" : "outline"}
          onClick={() => setFilterPlatform("all")}
          className={filterPlatform === "all" ? "bg-[#1e82b4] text-white hover:bg-[#1e82b4]" : "bg-transparent border-white/10 text-white hover:bg-white/5"}
        >
          All
        </Button>
        {PLATFORMS.map(p => (
          <Button
            key={p}
            variant={filterPlatform === p ? "default" : "outline"}
            onClick={() => setFilterPlatform(p)}
            className={filterPlatform === p ? "bg-[#1e82b4] text-white hover:bg-[#1e82b4]" : "bg-transparent border-white/10 text-white hover:bg-white/5"}
          >
            {p}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#1e82b4] animate-spin" />
        </div>
      ) : !ideas || ideas.length === 0 ? (
        <div className="text-center py-24 px-4 bg-[#141414] border border-white/5 rounded-2xl">
          <Lightbulb className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No ideas found</h3>
          <p className="text-white/50 mb-6">Generate some AI content ideas to get started.</p>
          <Button onClick={() => setIsGenerateOpen(true)} variant="outline" className="border-white/10 text-white hover:bg-white/5">
            Generate Ideas
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {ideas.map((idea) => (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#141414] border border-white/5 rounded-2xl p-6 flex flex-col group hover:border-white/10 transition-colors relative"
              >
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(idea.id)}
                  className="absolute top-4 right-4 text-white/20 hover:text-[#e01814] hover:bg-[#e01814]/10 opacity-0 group-hover:opacity-100 transition-all h-8 w-8 rounded-lg"
                  data-testid={`button-delete-${idea.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-md bg-white/5 text-xs font-medium text-white/80">
                    {idea.platform}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-[#1e82b4]/10 text-[#1e82b4] text-xs font-medium">
                    {idea.theme}
                  </span>
                </div>
                
                <h3 className="font-semibold text-white text-lg mb-3">{idea.title}</h3>
                
                <div className="flex-1 text-sm text-white/70 font-light leading-relaxed mb-6 whitespace-pre-wrap">
                  {idea.body}
                </div>

                <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {idea.hashtags.map(tag => (
                      <span key={tag} className="text-xs text-[#f6a610] flex items-center">
                        <Hash className="w-3 h-3 mr-0.5" />{tag.replace('#', '')}
                      </span>
                    ))}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full bg-white/5 hover:bg-white/10 text-white rounded-xl h-9"
                    onClick={() => copyToClipboard(idea.body, idea.id)}
                    data-testid={`button-copy-${idea.id}`}
                  >
                    {copiedId === idea.id ? (
                      <><Check className="w-4 h-4 mr-2 text-green-400" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copy Text</>
                    )}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
