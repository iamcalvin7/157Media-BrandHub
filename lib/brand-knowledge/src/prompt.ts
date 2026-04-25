// Format brand knowledge as a system-prompt block for the AI agent.
//
// AUTO-FEED CONTRACT: Whatever is in the BRAND_CONTENT registry is what the
// agent knows. Adding a field to the registry (offer, timeline entry, USP,
// travel rule, etc.) automatically appears in this output and therefore in
// the agent's system prompt. There is no second sync.

import {
  BRAND_CONTENT,
  EMPTY_BRAND_CONTENT,
  type BrandContent,
  type Excursion,
  type ExcursionsHighlightGroup,
  type Offer,
  type OnboardSection,
  type TravelInfoSection,
  type Vessel,
} from "./index.js";

function nonEmpty(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// Scaffold strings live in EMPTY_BRAND_CONTENT so the UI can show "Not
// configured yet" cards. They must NOT be sent to the LLM as if they were
// real knowledge — that would teach the agent to claim, e.g., that a brand's
// history is "not configured yet". Treat these as empty for prompt purposes.
const PLACEHOLDER_PATTERN = /not configured yet/i;
function meaningful(value: string | undefined | null): boolean {
  return nonEmpty(value) && !PLACEHOLDER_PATTERN.test(value!);
}

function bulletList(items: readonly string[]): string {
  return items
    .filter(nonEmpty)
    .map((item) => `- ${item.trim()}`)
    .join("\n");
}

function formatVessel(v: Vessel): string {
  const meta = [
    nonEmpty(v.role) ? v.role : null,
    nonEmpty(v.length) ? v.length : null,
    nonEmpty(v.capacity) ? v.capacity : null,
    nonEmpty(v.hull) && v.hull.trim() !== "—" ? `hull ${v.hull}` : null,
    nonEmpty(v.inService) ? `in service ${v.inService}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `- **${v.name}** — ${meta}\n  ${v.description.trim()}`;
}

function formatOffer(o: Offer): string {
  const prices = o.prices
    .map((p) => `${p.label}: ${p.value}`)
    .join(" · ");
  const schedule = o.schedule?.length
    ? `\n  Schedule: ${o.schedule.map((s) => `${s.label} — ${s.value}`).join(" · ")}`
    : "";
  const notes = o.notes.length
    ? `\n  Notes: ${o.notes.join(" · ")}`
    : "";
  return [
    `- **${o.name}** (${o.badge})`,
    `  ${o.description.trim()}`,
    nonEmpty(o.hook) ? `  Hook: "${o.hook.trim()}"` : null,
    nonEmpty(o.validity) ? `  Validity: ${o.validity.trim()}` : null,
    prices ? `  Prices: ${prices}` : null,
    schedule || null,
    notes || null,
  ]
    .filter((line) => line !== null && line !== "")
    .join("\n");
}

function formatTravelSection(s: TravelInfoSection): string {
  const parts: string[] = [`### ${s.title}`];
  if (nonEmpty(s.intro)) parts.push(s.intro!.trim());
  if (s.bullets?.length) parts.push(bulletList(s.bullets));
  if (s.notes?.length) {
    for (const n of s.notes) {
      parts.push(`- **${n.label}** — ${n.body.trim()}`);
    }
  }
  return parts.join("\n");
}

function formatHighlightGroup(g: ExcursionsHighlightGroup): string {
  return `**${g.title}**\n${bulletList(g.items)}`;
}

function formatExcursion(e: Excursion): string {
  const dest = e.destinations.length ? ` (${e.destinations.join(", ")})` : "";
  const desc = nonEmpty(e.description) ? ` — ${e.description!.trim()}` : "";
  return `- **${e.name}** [${e.season}]${dest}${desc}`;
}

function formatOnboardSection(s: OnboardSection): string {
  const parts: string[] = [`### ${s.title}`];
  if (nonEmpty(s.intro)) parts.push(s.intro!.trim());
  if (s.bullets?.length) parts.push(bulletList(s.bullets));
  if (s.notes?.length) {
    for (const n of s.notes) {
      parts.push(`- **${n.label}** — ${n.body.trim()}`);
    }
  }
  return parts.join("\n");
}

function section(heading: string, body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  return `## ${heading}\n${trimmed}`;
}

/**
 * Build a structured markdown block describing everything the agent knows
 * about the given brand. Returned string is safe to concatenate after the
 * curated editorial brief in the agent's system prompt.
 *
 * Sections that are empty for the active brand are simply omitted so the
 * agent isn't fed "Not configured yet" placeholder language.
 */
export function formatBrandKnowledgeAsPrompt(slug: string | null | undefined): string {
  const knowledge: BrandContent = slug
    ? BRAND_CONTENT[slug] ?? EMPTY_BRAND_CONTENT
    : EMPTY_BRAND_CONTENT;

  const blocks: string[] = [];

  // Header
  if (nonEmpty(knowledge.brandDisplayName)) {
    blocks.push(`# ${knowledge.brandDisplayName.trim()} — knowledge base`);
    blocks.push(
      "The following is the live, structured knowledge for this brand, sourced directly from the brand-content registry. Use it as the source of truth when generating, planning, or fact-checking content.",
    );
  }

  // Identity
  const id = knowledge.identity;
  const identityParts: string[] = [];
  if (meaningful(id.brandStory)) identityParts.push(`**Brand story.** ${id.brandStory.trim()}`);
  if (id.toneOfVoice.length) identityParts.push(`**Tone of voice.**\n${bulletList(id.toneOfVoice)}`);
  if (id.keyMessages.length) identityParts.push(`**Key messages.**\n${bulletList(id.keyMessages)}`);
  if (id.whatToSay.length) identityParts.push(`**What to say.**\n${bulletList(id.whatToSay)}`);
  if (id.whatNotToSay.length) identityParts.push(`**What NOT to say.**\n${bulletList(id.whatNotToSay)}`);
  const identityBlock = section("Brand identity", identityParts.join("\n\n"));
  if (identityBlock) blocks.push(identityBlock);

  // History (hero + timeline + heritage + sister)
  const h = knowledge.history;
  const historyParts: string[] = [];
  if (meaningful(h.hero?.subtitle)) historyParts.push(h.hero.subtitle.trim());
  if (h.stats.length) {
    historyParts.push(
      `**Headline numbers.** ${h.stats
        .filter((s) => nonEmpty(s.value) && nonEmpty(s.label))
        .map((s) => `${s.value} ${s.label}`)
        .join(" · ")}`,
    );
  }
  if (h.timeline.length) {
    historyParts.push(
      `**Timeline.**\n${h.timeline
        .map((t) => `- **${t.year} — ${t.title}.** ${t.body.trim()}`)
        .join("\n")}`,
    );
  }
  if (h.heritage.length) {
    historyParts.push(
      `**Heritage notes.**\n${h.heritage
        .map((n) => `- **${n.title}.** ${n.body.trim()}`)
        .join("\n")}`,
    );
  }
  if (h.sister) {
    const detailLine = h.sister.details
      .map((d) => `${d.label}: ${d.value}`)
      .join(" · ");
    historyParts.push(
      `**Related operation.** ${h.sister.title.trim()} — ${h.sister.description.trim()} (${detailLine})`,
    );
  }
  const historyBlock = section("Brand history", historyParts.join("\n\n"));
  if (historyBlock) blocks.push(historyBlock);

  // Fleet
  if (h.vessels.length) {
    const fleetIntro = nonEmpty(h.fleetSubtitle) ? `${h.fleetSubtitle!.trim()}\n\n` : "";
    const fleetBlock = section("Fleet", `${fleetIntro}${h.vessels.map(formatVessel).join("\n\n")}`);
    if (fleetBlock) blocks.push(fleetBlock);
  }

  // USPs
  const usp = knowledge.usp;
  if (usp.sections.length) {
    const uspBody = usp.sections
      .filter((s) => s.items.length > 0)
      .map((s) => `### ${s.title}\n${bulletList(s.items)}`)
      .join("\n\n");
    const uspBlock = section("Unique selling points", uspBody);
    if (uspBlock) blocks.push(uspBlock);
  }

  // Offers
  const offers = knowledge.offers;
  if (offers.offers.length) {
    const offerBody = offers.offers.map(formatOffer).join("\n\n");
    const offerNotes = offers.notes.length
      ? `\n\n**Offer copy guidance.**\n${offers.notes.map((n) => `- **${n.title}.** ${n.body.trim()}`).join("\n")}`
      : "";
    const offerBlock = section("Live offers & pricing", `${offerBody}${offerNotes}`);
    if (offerBlock) blocks.push(offerBlock);
  }

  // Travel info
  const travel = knowledge.travelInfo;
  if (travel.sections.length) {
    const travelHeader = meaningful(travel.headerNote) ? `${travel.headerNote!.trim()}\n\n` : "";
    const travelBody = travel.sections.map(formatTravelSection).join("\n\n");
    const sourceLine = nonEmpty(travel.sourceUrl)
      ? `\n\nSource: ${travel.sourceLabel ?? travel.sourceUrl}`
      : "";
    const travelBlock = section(
      "Travel info (operational reference)",
      `${travelHeader}${travelBody}${sourceLine}`,
    );
    if (travelBlock) blocks.push(travelBlock);
  }

  // Onboard experience
  const onboard = knowledge.onboardExperience;
  if (onboard?.sections.length) {
    const onboardHeader = meaningful(onboard.headerSubtitle) ? `${onboard.headerSubtitle.trim()}\n\n` : "";
    const onboardBody = onboard.sections.map(formatOnboardSection).join("\n\n");
    const onboardFooter = nonEmpty(onboard.footer) ? `\n\n${onboard.footer!.trim()}` : "";
    const onboardBlock = section(
      "Onboard experience",
      `${onboardHeader}${onboardBody}${onboardFooter}`,
    );
    if (onboardBlock) blocks.push(onboardBlock);
  }

  // Excursions / destination context
  const exc = knowledge.excursions;
  if (exc && (exc.excursions.length > 0 || exc.highlightGroups.length > 0 || meaningful(exc.intro))) {
    const parts: string[] = [];
    if (meaningful(exc.headerSubtitle)) parts.push(exc.headerSubtitle.trim());
    if (meaningful(exc.intro)) parts.push(exc.intro!.trim());
    if (exc.highlightGroups.length) {
      parts.push(exc.highlightGroups.map(formatHighlightGroup).join("\n\n"));
    }
    if (exc.excursions.length) {
      parts.push(
        `**Named excursions captured from the brand's published catalogue** (treat as a known sample — may be incomplete; cross-check the live website before promising specific excursions to customers).\n${exc.excursions.map(formatExcursion).join("\n")}`,
      );
    }
    if (meaningful(exc.closingNote)) parts.push(`Tagline: "${exc.closingNote!.trim()}"`);
    if (nonEmpty(exc.sourceUrl)) parts.push(`Source: ${exc.sourceLabel ?? exc.sourceUrl}`);
    const excBlock = section("Excursions & destination context", parts.join("\n\n"));
    if (excBlock) blocks.push(excBlock);
  }

  // Social media reference
  const social = knowledge.socialMedia;
  const socialParts: string[] = [];
  if (social.markets.length) {
    socialParts.push(
      `**Markets & channels.**\n${social.markets
        .map((m) => {
          const platforms = m.platforms
            .map((p) => `${p.name} (${p.handle}) — ${p.cadence}`)
            .join("; ");
          const noteLine = nonEmpty(m.note) ? ` Note: ${m.note!.trim()}` : "";
          return `- **${m.market}** — Audience: ${m.audience.trim()}. Frame: ${m.frame.trim()}.${noteLine} Platforms: ${platforms}.`;
        })
        .join("\n")}`,
    );
  }
  if (social.pillars.length) {
    socialParts.push(
      `**Content pillars.**\n${social.pillars
        .map((p) => `- **${p.number} ${p.title}.** ${p.desc.trim()}`)
        .join("\n")}`,
    );
  }
  if (social.registers.length) {
    socialParts.push(
      `**Tone registers.**\n${social.registers
        .map((r) => `- **${r.label}.** ${r.desc.trim()} Example: "${r.example.trim()}"`)
        .join("\n")}`,
    );
  }
  if (social.crossPosting) {
    if (social.crossPosting.when.length) {
      socialParts.push(`**Cross-post when:** ${social.crossPosting.when.join(", ")}.`);
    }
    if (social.crossPosting.platformSpecific.length) {
      socialParts.push(`**Platform-specific:** ${social.crossPosting.platformSpecific.join(", ")}.`);
    }
  }
  const socialBlock = section("Social media reference", socialParts.join("\n\n"));
  if (socialBlock) blocks.push(socialBlock);

  // Monthly planning audience framing
  const mp = knowledge.monthlyPlanning;
  const planningParts: string[] = [];
  if (meaningful(mp.englishAudienceLine)) {
    planningParts.push(`- **${mp.englishMarketLabel}** — ${mp.englishAudienceLine.trim()}`);
  }
  if (meaningful(mp.italianAudienceLine)) {
    planningParts.push(`- **${mp.italianMarketLabel}** — ${mp.italianAudienceLine.trim()}`);
  }
  if (planningParts.length) {
    const planningBlock = section("Audience framing per market", planningParts.join("\n"));
    if (planningBlock) blocks.push(planningBlock);
  }

  if (blocks.length === 0) return "";

  return `\n\n---\n\n${blocks.join("\n\n")}\n`;
}
