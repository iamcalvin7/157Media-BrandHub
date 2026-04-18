import { Router, type IRouter } from "express";
import { eq, and, desc, ne, isNotNull } from "drizzle-orm";
import { db, conversations, messages, contentPostsTable, brandVoiceNotesTable, eventsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { brandGuidelinesSystemPrompt } from "../lib/brandGuidelines.js";
import { knowledgeChangelog } from "../lib/knowledgeChangelog.js";
import {
  CreateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

async function buildKnowledgeContext(): Promise<string> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [recent, voiceNotes, upcomingEvents] = await Promise.all([
      db.select().from(contentPostsTable).where(and(
        eq(contentPostsTable.status, "approved"),
        ne(contentPostsTable.caption, ""),
        isNotNull(contentPostsTable.caption),
      )).orderBy(desc(contentPostsTable.created_at)).limit(25),
      db.select().from(brandVoiceNotesTable).orderBy(desc(brandVoiceNotesTable.created_at)).limit(60),
      db.select().from(eventsTable).orderBy(eventsTable.date).limit(60),
    ]);

    let out = "";

    if (knowledgeChangelog.length > 0) {
      const sorted = [...knowledgeChangelog].sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 25);
      const blocks = sorted.map((e) => {
        const caps = e.capabilities.map((c) => `  • ${c}`).join("\n");
        return `[${e.date}] ${e.category} — ${e.summary}\n${caps}`;
      }).join("\n\n");
      out += `\n\n---\n\n# KNOWLEDGE CHANGELOG (AUTHORITATIVE — most recent first)\n\nThese entries are the most recent additions to your knowledge base. They override anything older in the brand guide that conflicts.\n\n${blocks}\n`;
    }

    if (upcomingEvents.length > 0) {
      const future = upcomingEvents.filter((e) => (e.end_date ?? e.date) >= today).slice(0, 30);
      if (future.length > 0) {
        const blocks = future.map((e) => {
          const range = e.end_date && e.end_date !== e.date ? `${e.date} → ${e.end_date}` : e.date;
          const recur = e.recurring ? " (recurring)" : "";
          const notes = e.notes ? ` — ${e.notes.trim()}` : "";
          return `- [${range}${recur}] (${e.market} · ${e.type}) ${e.title}${notes}`;
        }).join("\n");
        out += `\n\n---\n\n# UPCOMING EVENTS (from the events database)\n\nLive feed of events the team is tracking. Use these when planning content, suggesting timing, or answering "what's happening in [month]?".\n\n${blocks}\n`;
      }
    }

    if (voiceNotes.length > 0) {
      const uniq = Array.from(new Set(voiceNotes.map((n) => n.note.trim()))).slice(0, 50);
      out += `\n\n---\n\n# DISTILLED BRAND VOICE MEMORY\n\nAccumulated craft observations drawn from every caption the team has approved. Treat these as rules of thumb for what "on-brand" sounds like right now. Honour them when writing or giving advice.\n\n${uniq.map((n) => `- ${n}`).join("\n")}\n`;
    }

    if (recent.length > 0) {
      const blocks = recent.map((p, i) => {
        const meta = [p.market, p.platform, p.pillar, p.format].filter(Boolean).join(" · ");
        const date = p.scheduled_date ? ` (${p.scheduled_date})` : "";
        return `${i + 1}. [${meta}]${date}\n${p.caption.trim()}`;
      }).join("\n\n");
      out += `\n\n---\n\n# RECENTLY APPROVED CAPTIONS (REFERENCE)\n\nThe most recent 25 captions approved in the content calendar. Use them as evidence of the voice and rhythm actually being shipped. Do not copy them verbatim.\n\n${blocks}\n`;
    }

    return out;
  } catch (err) {
    console.error("buildKnowledgeContext failed", err);
    return "";
  }
}

const router: IRouter = Router();

router.get("/chat/conversations", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .orderBy(conversations.createdAt);
  res.json(rows);
});

router.post("/chat/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db.insert(conversations).values(parsed.data).returning();
  res.status(201).json(conv);
});

router.get("/chat/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/chat/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(conversations).where(eq(conversations.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/chat/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, params.data.id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conv.id))
    .orderBy(messages.createdAt);

  const [userMsg] = await db.insert(messages).values({
    conversationId: conv.id,
    role: "user",
    content: body.data.content,
  }).returning();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const knowledgeContext = await buildKnowledgeContext();

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: brandGuidelinesSystemPrompt + knowledgeContext },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: body.data.content },
  ];

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: conv.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true, messageId: userMsg.id })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  }

  res.end();
});

export default router;
