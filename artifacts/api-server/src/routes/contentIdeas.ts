import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, contentIdeasTable } from "@workspace/db";
import { recordTombstone } from "../lib/tombstones.js";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getBrandGuidelinesPrompt, getBrandName } from "../lib/brandGuidelines.js";
import {
  ListContentIdeasQueryParams,
  GenerateContentIdeasBody,
  DeleteContentIdeaParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/content-ideas", async (req, res): Promise<void> => {
  const query = ListContentIdeasQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const ideas = await db
    .select()
    .from(contentIdeasTable)
    .where(eq(contentIdeasTable.brand_id, req.brandId))
    .orderBy(contentIdeasTable.createdAt);

  const filtered = ideas.filter((idea) => {
    if (query.data.platform && idea.platform !== query.data.platform) return false;
    if (query.data.theme && idea.theme !== query.data.theme) return false;
    return true;
  });

  res.json(filtered);
});

router.post("/content-ideas", async (req, res): Promise<void> => {
  const body = GenerateContentIdeasBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const count = body.data.count ?? 3;
  const brandName = getBrandName(req.brandId);
  const prompt = `Generate ${count} original social media content idea${count > 1 ? "s" : ""} for ${brandName} on ${body.data.platform} with the theme: "${body.data.theme}".

Return a JSON array with ${count} objects. Each object must have:
- "title": a short headline for the post (max 10 words)
- "body": the full post copy, written in the ${brandName} tone of voice (follow the brand guidelines in the system prompt)
- "hashtags": array of 3–5 relevant hashtags (without the # symbol)

Platform: ${body.data.platform}
Theme: ${body.data.theme}

Return ONLY valid JSON, no markdown, no extra text.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: getBrandGuidelinesPrompt(req.brandId) },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "[]";

  let ideas: { title: string; body: string; hashtags: string[] }[] = [];
  try {
    ideas = JSON.parse(raw);
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const inserted = await db
    .insert(contentIdeasTable)
    .values(
      ideas.map((idea) => ({
        brand_id: req.brandId,
        platform: body.data.platform,
        theme: body.data.theme,
        title: idea.title,
        body: idea.body,
        hashtags: idea.hashtags,
      }))
    )
    .returning();

  res.status(201).json(inserted);
});

router.delete("/content-ideas/:id", async (req, res): Promise<void> => {
  const params = DeleteContentIdeaParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Always include brand_id in the WHERE clause so a caller in one brand
  // cannot delete another brand's idea by guessing or replaying an ID.
  const [deleted] = await db
    .delete(contentIdeasTable)
    .where(and(eq(contentIdeasTable.id, params.data.id), eq(contentIdeasTable.brand_id, req.brandId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Content idea not found" });
    return;
  }
  await recordTombstone("content_ideas", params.data.id);

  res.sendStatus(204);
});

export default router;
