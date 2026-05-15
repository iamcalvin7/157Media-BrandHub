import { Router, type IRouter } from "express";
import { eq, and, desc, ne, isNotNull } from "drizzle-orm";
import {
  db, conversations, messages,
  contentPostsTable, brandVoiceNotesTable, eventsTable,
  changelogEntriesTable, copywriterRulesTable, copywriterFeedbackTable,
  contentIdeasTable, savedItemsTable, mediaAssetsTable, pastPostsTable,
  pillarsTable,
} from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getBrandGuidelinesPrompt } from "../lib/brandGuidelines.js";
import { brandKnowledgeChangelog } from "../lib/knowledgeChangelog.js";
import { getSicilyEventsCached } from "./sicilyEvents.js";
import {
  CreateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";

// Build the dynamic knowledge context for a single brand. Every query is
// brand-scoped so brand A never sees brand B's posts, voice notes, ideas, etc.
async function buildKnowledgeContext(brandId: number, brandSlug: string): Promise<string> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [
      recent, voiceNotes, upcomingEvents,
      dbChangelog, copywriterRules, copywriterFeedback,
      contentIdeas, savedItems, mediaAssets, pastPosts, pillars,
    ] = await Promise.all([
      db.select().from(contentPostsTable).where(and(
        eq(contentPostsTable.brand_id, brandId),
        eq(contentPostsTable.status, "approved"),
        ne(contentPostsTable.caption, ""),
        isNotNull(contentPostsTable.caption),
      )).orderBy(desc(contentPostsTable.created_at)).limit(25),
      db.select().from(brandVoiceNotesTable)
        .where(eq(brandVoiceNotesTable.brand_id, brandId))
        .orderBy(desc(brandVoiceNotesTable.created_at)).limit(60),
      db.select().from(eventsTable)
        .where(eq(eventsTable.brand_id, brandId))
        .orderBy(eventsTable.date).limit(60),
      db.select().from(changelogEntriesTable)
        .where(eq(changelogEntriesTable.brand_id, brandId))
        .orderBy(desc(changelogEntriesTable.sortKey)).limit(40),
      db.select().from(copywriterRulesTable)
        .where(eq(copywriterRulesTable.brand_id, brandId))
        .orderBy(desc(copywriterRulesTable.updated_at)).limit(1),
      db.select().from(copywriterFeedbackTable)
        .where(eq(copywriterFeedbackTable.brand_id, brandId))
        .orderBy(desc(copywriterFeedbackTable.created_at)).limit(30),
      db.select().from(contentIdeasTable)
        .where(eq(contentIdeasTable.brand_id, brandId))
        .orderBy(desc(contentIdeasTable.createdAt)).limit(30),
      db.select().from(savedItemsTable)
        .where(eq(savedItemsTable.brand_id, brandId))
        .orderBy(desc(savedItemsTable.createdAt)).limit(30),
      db.select().from(mediaAssetsTable)
        .where(eq(mediaAssetsTable.brand_id, brandId))
        .orderBy(desc(mediaAssetsTable.createdAt)).limit(60),
      db.select().from(pastPostsTable)
        .where(eq(pastPostsTable.brand_id, brandId))
        .orderBy(desc(pastPostsTable.imported_at)).limit(20),
      db.select().from(pillarsTable).where(and(
        eq(pillarsTable.brand_id, brandId),
        eq(pillarsTable.active, true),
      )).orderBy(pillarsTable.sort_order),
    ]);

    let out = "";

    // Active content pillars (current taxonomy the team is working with)
    if (pillars.length > 0) {
      const blocks = pillars.map((p) => `- ${p.name} (${p.market})`).join("\n");
      out += `\n\n---\n\n# ACTIVE CONTENT PILLARS\n\nThe pillars currently in use across the calendar. Always tag work to one of these.\n\n${blocks}\n`;
    }

    // Knowledge changelog: DB-backed entries (per brand) + hardcoded brand seeds
    const staticChangelog = brandKnowledgeChangelog.get(brandId) ?? [];
    const mergedChangelog = [
      ...dbChangelog.map((e) => ({ sortKey: e.sortKey, date: e.date, category: e.category, summary: e.summary, capabilities: e.capabilities })),
      ...staticChangelog,
    ];
    if (mergedChangelog.length > 0) {
      const seen = new Set<string>();
      const sorted = mergedChangelog
        .filter((e) => (seen.has(e.sortKey) ? false : (seen.add(e.sortKey), true)))
        .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
        .slice(0, 40);
      const blocks = sorted.map((e) => {
        const caps = (e.capabilities ?? []).map((c) => `  • ${c}`).join("\n");
        return `[${e.date}] ${e.category} — ${e.summary}${caps ? `\n${caps}` : ""}`;
      }).join("\n\n");
      out += `\n\n---\n\n# KNOWLEDGE CHANGELOG (AUTHORITATIVE — most recent first)\n\nThese entries are the most recent additions to your knowledge base. They override anything older in the brand guide that conflicts.\n\n${blocks}\n`;
    }

    // Copywriter house rules (the user's standing instructions to the writing assistant)
    if (copywriterRules.length > 0 && copywriterRules[0].content?.trim()) {
      out += `\n\n---\n\n# COPYWRITER HOUSE RULES (latest)\n\nThese are the team's standing copywriting instructions. Always follow them when writing or critiquing copy.\n\n${copywriterRules[0].content.trim()}\n`;
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

    // Virtu Ferries only — pull the Sicily live feed so the agent knows
    // what's happening on the destination side. Cached for 1h inside the
    // route, so hot turns add no measurable latency.
    if (brandSlug === "virtu-ferries") {
      try {
        // Read-only — never trigger a crawl from a chat request. The cache
        // is warmed on server boot and refreshed by the /api/sicily-events
        // route, so we just consume whatever's already there.
        const cached = getSicilyEventsCached();
        const sicilyEvents = cached?.events ?? [];
        const future = sicilyEvents
          .filter((e) => e.start && e.start.slice(0, 10) >= today)
          .slice(0, 25);
        if (future.length > 0) {
          const blocks = future.map((e) => {
            const startDay = e.start ? e.start.slice(0, 10) : "tba";
            const endDay = e.end && e.end.slice(0, 10) !== startDay ? ` → ${e.end.slice(0, 10)}` : "";
            const place = e.location ? ` · ${e.location}` : "";
            const cats = e.categories.length > 0 ? ` [${e.categories.slice(0, 3).join(", ")}]` : "";
            return `- [${startDay}${endDay}] ${e.title}${place}${cats} — ${e.url}`;
          }).join("\n");
          out += `\n\n---\n\n# SICILY LIVE EVENTS (from visitsicily.info, refreshed hourly)\n\nUse these to inspire "Choose Sicily" and "Virtu Recommends" content. Always credit "visitsicily.info" when paraphrasing their copy. Don't repost their photos verbatim — use them only as visual reference for the designer's brief.\n\n${blocks}\n`;
        }
      } catch (err) {
        // Soft-fail: never block a chat turn on the external feed being down.
        console.warn("Sicily events feed unavailable for chat context", err);
      }
    }

    // Active idea bank — content ideas not yet shipped
    if (contentIdeas.length > 0) {
      const blocks = contentIdeas.map((i) => {
        const tags = (i.hashtags ?? []).slice(0, 6).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
        return `- (${i.platform} · ${i.theme}) ${i.title}${tags ? ` — ${tags}` : ""}`;
      }).join("\n");
      out += `\n\n---\n\n# ACTIVE CONTENT IDEAS BANK\n\nIdeas the team has captured but not yet scheduled. Pull from here when asked to suggest content.\n\n${blocks}\n`;
    }

    // Saved items / inspiration board
    if (savedItems.length > 0) {
      const blocks = savedItems.map((s) => {
        const bits = [s.kind, s.title].filter(Boolean).join(" · ");
        const note = s.notes ? ` — ${s.notes.trim()}` : "";
        const url = s.url ? ` (${s.url})` : "";
        return `- ${bits || "saved"}${note}${url}`;
      }).join("\n");
      out += `\n\n---\n\n# SAVED / INSPIRATION BOARD\n\nReferences the team has saved for inspiration or reuse. Use to ground suggestions.\n\n${blocks}\n`;
    }

    // Media asset library catalogue (names + descriptions + tags so the agent can recommend assets)
    if (mediaAssets.length > 0) {
      const blocks = mediaAssets.map((m) => {
        const tags = (m.tags ?? []).slice(0, 6).join(", ");
        const desc = m.description ? ` — ${m.description.trim()}` : "";
        return `- [${m.kind}] ${m.name}${desc}${tags ? ` (tags: ${tags})` : ""}`;
      }).join("\n");
      out += `\n\n---\n\n# MEDIA ASSET LIBRARY (catalogue)\n\nAvailable assets the team can reuse. When recommending visuals, prefer suggesting one of these by name.\n\n${blocks}\n`;
    }

    // Historical post archive (imported from past calendars)
    if (pastPosts.length > 0) {
      const blocks = pastPosts.slice(0, 15).map((p) => {
        const meta = [p.date, p.platform, p.market].filter(Boolean).join(" · ");
        return `- [${meta}] ${p.caption.trim().slice(0, 220)}${p.caption.length > 220 ? "…" : ""}`;
      }).join("\n");
      out += `\n\n---\n\n# HISTORICAL POSTS (archive)\n\nReference: posts from previous calendars the team has imported. Use as voice/tone evidence, never copy verbatim.\n\n${blocks}\n`;
    }

    // Copywriter feedback — what got rejected and why (negative training signal)
    if (copywriterFeedback.length > 0) {
      const rejections = copywriterFeedback.filter((f) => f.type === "rejected" && f.note?.trim()).slice(0, 15);
      if (rejections.length > 0) {
        const blocks = rejections.map((f) => {
          const meta = [f.market, f.platform, f.post_type].filter(Boolean).join(" · ");
          const cap = f.caption ? `"${f.caption.trim().slice(0, 140)}${f.caption.length > 140 ? "…" : ""}"` : "";
          return `- [${meta}] rejected ${cap} — reason: ${f.note?.trim()}`;
        }).join("\n");
        out += `\n\n---\n\n# RECENT COPYWRITER REJECTIONS (avoid these patterns)\n\nWhat the team has explicitly rejected and why. Treat each reason as a hard "don't".\n\n${blocks}\n`;
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

router.get("/chat/conversations", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.brand_id, req.brandId))
    .orderBy(conversations.createdAt);
  res.json(rows);
});

router.post("/chat/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [conv] = await db.insert(conversations)
    .values({ ...parsed.data, brand_id: req.brandId })
    .returning();
  res.status(201).json(conv);
});

router.get("/chat/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.brand_id, req.brandId)));
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
  const [deleted] = await db.delete(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.brand_id, req.brandId)))
    .returning();
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

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, params.data.id), eq(conversations.brand_id, req.brandId)));
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

  const knowledgeContext = await buildKnowledgeContext(req.brandId, req.brandSlug);
  const systemPrompt = getBrandGuidelinesPrompt(req.brandId);

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt + knowledgeContext },
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
