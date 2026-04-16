import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, contentPostsTable, approvalDecisionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { brandGuidelinesSystemPrompt } from "../lib/brandGuidelines.js";

const router: IRouter = Router();

// ─── Preference Injection Helper ──────────────────────────────────────────────
async function learnedPreferencesBlock(): Promise<string> {
  try {
    const decisions = await db
      .select({
        decision: approvalDecisionsTable.decision,
        rejection_reason: approvalDecisionsTable.rejection_reason,
        pillar: contentPostsTable.pillar,
        tone_register: contentPostsTable.tone_register,
        format: contentPostsTable.format,
        market: contentPostsTable.market,
      })
      .from(approvalDecisionsTable)
      .innerJoin(contentPostsTable, eq(approvalDecisionsTable.post_id, contentPostsTable.id));

    if (decisions.length === 0) return "";

    type Agg = { pillar: string; tone_register: string; format: string; market: string; count: number };
    const approvedMap: Record<string, Agg> = {};
    const rejectedMap: Record<string, Agg & { reasons: string[] }> = {};
    const reasonCounts: Record<string, number> = {};

    for (const d of decisions) {
      const key = `${d.pillar}|${d.tone_register}|${d.format}|${d.market}`;
      if (d.decision === "approved") {
        if (!approvedMap[key]) approvedMap[key] = { pillar: d.pillar, tone_register: d.tone_register, format: d.format, market: d.market, count: 0 };
        approvedMap[key].count += 1;
      } else {
        if (!rejectedMap[key]) rejectedMap[key] = { pillar: d.pillar, tone_register: d.tone_register, format: d.format, market: d.market, count: 0, reasons: [] };
        rejectedMap[key].count += 1;
        if (d.rejection_reason) {
          rejectedMap[key].reasons.push(d.rejection_reason);
          reasonCounts[d.rejection_reason] = (reasonCounts[d.rejection_reason] ?? 0) + 1;
        }
      }
    }

    const approvedList = Object.values(approvedMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => `- ${p.pillar} / ${p.tone_register} / ${p.format} (${p.market}, approved ${p.count}×)`);

    const rejectedList = Object.values(rejectedMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => `- ${p.pillar} / ${p.tone_register} / ${p.format} (${p.market}): ${[...new Set(p.reasons)].join("; ")}`);

    const constraints = Object.entries(reasonCounts)
      .filter(([, n]) => n >= 3)
      .map(([r]) => `- ${r}`);

    const lines: string[] = ["\n\nLEARNED PREFERENCES"];
    if (approvedList.length) lines.push("Approved patterns:\n" + approvedList.join("\n"));
    if (rejectedList.length) lines.push("Rejected patterns:\n" + rejectedList.join("\n"));
    if (constraints.length) lines.push("Active constraints (do not repeat these):\n" + constraints.join("\n"));

    return lines.join("\n");
  } catch {
    return "";
  }
}

// POST /api/openai/brand-guidelines
// Streaming chat — full message history passed in from client
router.post("/openai/brand-guidelines", async (req, res): Promise<void> => {
  const { messages } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const preferences = await learnedPreferencesBlock();

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: brandGuidelinesSystemPrompt + preferences },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  }

  res.end();
});

// POST /api/openai/social-expert
// Structured JSON verdict for copy or image review
router.post("/openai/social-expert", async (req, res): Promise<void> => {
  const { copy, imageBase64, platform, context } = req.body as {
    copy?: string;
    imageBase64?: string;
    platform?: string;
    context?: string;
  };

  if (!copy && !imageBase64) {
    res.status(400).json({ error: "copy or imageBase64 is required" });
    return;
  }

  const structuredInstruction = `
You are reviewing content for Virtu Ferries. Return ONLY valid JSON — no markdown, no explanation outside the JSON block.

The JSON must have exactly this shape:
{
  "verdict": "On Brand" | "Needs Work" | "Off Brand",
  "explanation": "Plain language assessment (2–3 sentences)",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],
  "rewrite": "Rewritten version ready to use",
  "tone_notes": "Brief note on tone register and what it does well or doesn't"
}

Platform context: ${platform || "not specified"}
${context ? `Additional context: ${context}` : ""}
`;

  const userContent: { type: string; text?: string; image_url?: { url: string } }[] = [];

  if (copy) {
    userContent.push({ type: "text", text: `Please review this copy:\n\n${copy}` });
  }

  if (imageBase64) {
    userContent.push({
      type: "text",
      text: "Please review this image for brand fit and alignment with our visual and tonal guidelines.",
    });
    userContent.push({
      type: "image_url",
      image_url: { url: imageBase64 },
    });
  }

  const preferences = await learnedPreferencesBlock();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: `${brandGuidelinesSystemPrompt}${preferences}\n\n${structuredInstruction}` },
        {
          role: "user",
          content: imageBase64
            ? (userContent as Parameters<typeof openai.chat.completions.create>[0]["messages"][0]["content"])
            : (copy || ""),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";

    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: {
      verdict: string;
      explanation: string;
      suggestions: string[];
      rewrite: string;
      tone_notes: string;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "Failed to parse structured response", raw });
      return;
    }

    // Normalise verdict
    const validVerdicts = ["On Brand", "Needs Work", "Off Brand"];
    if (!validVerdicts.includes(parsed.verdict)) {
      parsed.verdict = "Needs Work";
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

// POST /api/openai/trend-adapt
// Analyse a trend and return an adapted content idea per applicable market
router.post("/openai/trend-adapt", async (req, res): Promise<void> => {
  const { description, link, imageBase64 } = req.body as {
    description?: string;
    link?: string;
    imageBase64?: string;
  };

  if (!description && !link && !imageBase64) {
    res.status(400).json({ error: "At least one of description, link, or imageBase64 must be provided" });
    return;
  }

  const structuredInstruction = `
You are analysing a social media trend for Virtu Ferries. Return ONLY valid JSON — no markdown, no text outside the JSON block.

The JSON must have exactly this shape:
{
  "mechanic": "What makes this trend work — format, hook, emotion, humour, structure, sound (2–3 sentences)",
  "fit": true | false,
  "fit_reason": "Why it does or doesn't translate to a travel/ferry brand honestly (1–2 sentences)",
  "ideas": [
    {
      "concept": "2–3 line content concept specific to Virtu Ferries",
      "why": "One line: why this works for VF",
      "market": "english" | "italian" | "both",
      "platform": "English Facebook" | "Italian Facebook" | "Italian Instagram"
    }
  ]
}

Rules:
- If fit is false, ideas must be an empty array []
- Never force a fit — if the trend doesn't translate honestly, set fit: false
- If fit is true, produce one idea per applicable market (English and/or Italian)
- Market "both" means the same idea works for both markets
- platform must be one of exactly: "English Facebook", "Italian Facebook", "Italian Instagram"
${link ? `\nThe user has also provided this link for context: ${link}` : ""}
`;

  const userContentParts: { type: string; text?: string; image_url?: { url: string } }[] = [];

  const userText: string[] = ["Please analyse this trend for Virtu Ferries:"];
  if (description) userText.push(`\nDescription: ${description}`);
  if (link) userText.push(`\nLink: ${link}`);

  userContentParts.push({ type: "text", text: userText.join("\n") });

  if (imageBase64) {
    userContentParts.push({
      type: "text",
      text: "\nI've also uploaded a screenshot of the trend:",
    });
    userContentParts.push({
      type: "image_url",
      image_url: { url: imageBase64 },
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: `${brandGuidelinesSystemPrompt}\n\n${structuredInstruction}` },
        {
          role: "user",
          content: imageBase64
            ? (userContentParts as Parameters<typeof openai.chat.completions.create>[0]["messages"][0]["content"])
            : userText.join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: {
      mechanic: string;
      fit: boolean;
      fit_reason: string;
      ideas: { concept: string; why: string; market: string; platform: string }[];
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "Failed to parse structured response", raw });
      return;
    }

    // Enforce: if fit is false, ideas must be empty
    if (!parsed.fit) {
      parsed.ideas = [];
    }

    res.json(parsed);
  } catch {
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

export default router;
