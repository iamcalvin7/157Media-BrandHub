import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, brandVoiceNotesTable, contentPostsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const SYSTEM = `You are a brand voice analyst for Virtu Ferries (a premium Malta-Sicily high-speed ferry).

Given one approved social media caption, distill 1-2 SHORT observations about what makes the writing feel on-brand. Each observation must be a single crisp sentence, focused on something concrete: a phrase structure, a rhythm pattern, a specific word choice, a tonal move (e.g. "ends on a statement, not a question"), or a distinctive turn of phrase worth remembering.

RULES:
- Never summarise what the caption is about.
- Never comment on topic or subject matter.
- Focus only on voice, rhythm, structure, or craft.
- Each note must stand on its own without context.
- Keep each note under 20 words.

Return ONLY the notes, one per line, with no numbering, no bullets, no preamble.`;

export async function distillVoiceNote(postId: number): Promise<void> {
  try {
    const [post] = await db.select().from(contentPostsTable).where(eq(contentPostsTable.id, postId));
    if (!post || !post.caption?.trim()) return;
    if (post.status !== "approved") return;

    const meta = [post.market, post.platform, post.pillar, post.format].filter(Boolean).join(" · ");
    const userPrompt = `[${meta}]\n\n${post.caption.trim()}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) return;

    const notes = text
      .split("\n")
      .map((l) => l.replace(/^[\-\*\d\.\)]+\s*/, "").trim())
      .filter((l) => l.length > 4 && l.length < 200);

    if (notes.length === 0) return;

    await db.insert(brandVoiceNotesTable).values(
      notes.map((n) => ({ source_post_id: postId, note: n })),
    );
  } catch (err) {
    console.error("distillVoiceNote failed for post", postId, err);
  }
}
