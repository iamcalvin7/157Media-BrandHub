import { Router, type IRouter } from "express";
import { eq, and, desc, ne, isNotNull } from "drizzle-orm";
import { db, conversations, messages, contentPostsTable, brandVoiceNotesTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { brandGuidelinesSystemPrompt } from "../lib/brandGuidelines.js";
import {
  CreateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

async function buildCalendarContext(): Promise<string> {
  try {
    const [recent, voiceNotes] = await Promise.all([
      db.select().from(contentPostsTable).where(and(
        eq(contentPostsTable.status, "approved"),
        ne(contentPostsTable.caption, ""),
        isNotNull(contentPostsTable.caption),
      )).orderBy(desc(contentPostsTable.created_at)).limit(25),
      db.select().from(brandVoiceNotesTable).orderBy(desc(brandVoiceNotesTable.created_at)).limit(60),
    ]);

    let out = "";

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
    console.error("buildCalendarContext failed", err);
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

  const calendarContext = await buildCalendarContext();

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: brandGuidelinesSystemPrompt + calendarContext },
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
