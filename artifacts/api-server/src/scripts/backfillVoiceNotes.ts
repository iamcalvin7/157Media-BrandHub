import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, brandVoiceNotesTable, contentPostsTable } from "@workspace/db";
import { and, isNotNull, sql, eq } from "drizzle-orm";

const SYSTEM = `You are a brand voice analyst for Virtu Ferries (a premium Malta-Sicily high-speed ferry).

Given one social media caption, distill 1-2 SHORT observations about what makes the writing feel on-brand. Each observation must be a single crisp sentence, focused on something concrete: a phrase structure, a rhythm pattern, a specific word choice, a tonal move (e.g. "ends on a statement, not a question"), or a distinctive turn of phrase worth remembering.

RULES:
- Never summarise what the caption is about.
- Never comment on topic or subject matter.
- Focus only on voice, rhythm, structure, or craft.
- Each note must stand on its own without context.
- Keep each note under 20 words.

Return ONLY the notes, one per line, with no numbering, no bullets, no preamble.`;

async function main() {
  const month = process.argv[2] ?? "2026-05";
  console.log(`Backfilling voice notes for month=${month}...`);

  const posts = await db
    .select()
    .from(contentPostsTable)
    .where(
      and(
        eq(contentPostsTable.month, month),
        isNotNull(contentPostsTable.caption),
        sql`LENGTH(TRIM(${contentPostsTable.caption})) > 20`,
      ),
    );

  console.log(`Found ${posts.length} posts with captions.`);

  let totalNotes = 0;
  let processed = 0;

  for (const post of posts) {
    if (!post.caption?.trim()) continue;
    try {
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

      const notes = text
        .split("\n")
        .map((l) => l.replace(/^[\-\*\d\.\)]+\s*/, "").trim())
        .filter((l) => l.length > 4 && l.length < 200);

      if (notes.length > 0) {
        await db.insert(brandVoiceNotesTable).values(
          notes.map((n) => ({ source_post_id: post.id, note: n })),
        );
        totalNotes += notes.length;
      }
      processed++;
      if (processed % 5 === 0) console.log(`  ${processed}/${posts.length} posts → ${totalNotes} notes so far`);
    } catch (err) {
      console.error(`  Post ${post.id} failed:`, err);
    }
  }

  console.log(`Done. Processed ${processed} posts, inserted ${totalNotes} voice notes.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
