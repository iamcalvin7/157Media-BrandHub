import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { brandGuidelinesSystemPrompt } from "../lib/brandGuidelines.js";

const router: IRouter = Router();

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

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: brandGuidelinesSystemPrompt },
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

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: `${brandGuidelinesSystemPrompt}\n\n${structuredInstruction}` },
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

export default router;
