export interface ChangelogEntryStatic {
  sortKey: string;
  date: string;
  category: string;
  summary: string;
  capabilities: string[];
}

export const knowledgeChangelog: ChangelogEntryStatic[] = [
  {
    sortKey: "2026-04-16-j",
    date: "2026-04-16",
    category: "Posting Cadence",
    summary: "Cadence updated to 25 posts per month per platform. Instagram strategy clarified: reuse Facebook content where possible, create IG-native posts when it doesn't translate.",
    capabilities: [
      "English market: 25 Facebook posts per month",
      "Italian market: 25 Facebook posts + 25 Instagram posts per month",
      "Instagram default: cross-post from Facebook where content is image/video-led and needs no link",
      "Instagram exception: platform-specific IG post created when FB post is link-heavy, long-form, or FB-native",
      "Generate-plan now targets 25 posts per market with even daily distribution",
    ],
  },
  {
    sortKey: "2026-04-16-i",
    date: "2026-04-16",
    category: "Content Pillars",
    summary: "Content pillars updated and expanded from 4 to 5. Each pillar now has a defined goal and tone register to guide content generation.",
    capabilities: [
      "Pillar 1 — Why VF: reasons to choose Virtu Ferries; crossing as the obvious, easy choice",
      "Pillar 2 — Why Sicily: destination-led content; sells Sicily so VF is the natural next step",
      "Pillar 3 — VF Recommends: curated local travel intel; positions VF as trusted guide not ticket seller",
      "Pillar 4 — Virtu Ferries Experience: on-board, crew, UGC, social proof; real people, real crossings",
      "Pillar 5 — Sicily Experience: immersive sensory content, no hard sell; let the island do the talking",
    ],
  },
  {
    sortKey: "2026-04-16-h",
    date: "2026-04-16",
    category: "Current Offers",
    summary: "Live offer pricing loaded into the agent. The agent now knows the three active offers, their prices, schedules, and how to use them as content material.",
    capabilities: [
      "One Day Offer: adult return €63.60, child €44.60, light car €109.00, motorbike €69.00",
      "More Than One Day Offer: adult return €63.60, light car €109.00 — extended until May 30, 2026",
      "Saturday Night in Malta (SNF): €57.00 per person return, 20:30 Saturday departure from Sicily, 06:30 Sunday return — running January–April 2026",
      "Offer copywriting rules: lead with human benefit, not price; SNF hook is 'Out Saturday night, home Sunday morning'",
      "Always directs to virtuferries.com for booking — never implies guaranteed availability",
    ],
  },
  {
    sortKey: "2026-04-16-g",
    date: "2026-04-16",
    category: "Company History & Fleet",
    summary: "Company heritage, fleet specifications, and scale data loaded. The agent now knows the founding story, vessel names and dimensions, annual volumes, and how to use this history as a creative and credibility asset.",
    capabilities: [
      "Founded 1988 in Malta — 36+ years of continuous operation, one of Malta's longest-serving transport institutions",
      "Fleet: Saint John Paul II (flagship, 110m, 900 pax, Incat 089, in service March 2019) and Jean de La Valette (106.5m, 800 pax, since 2010)",
      "Scale: 250,000+ passengers and 25,000+ vehicles annually — mainstream route, not niche",
      "All vessels fly the Maltese flag — local pride asset for English market content",
      "Year-round operation flagged as a genuine differentiator vs seasonal competitors",
      "Venezia Lines subsidiary: Adriatic routes, founded 2001, seasonal April–October",
      "Heritage framing guidance: use as credibility signal, not a boast; mainstream and familiar, not discovered",
    ],
  },
  {
    sortKey: "2026-04-16-f",
    date: "2026-04-16",
    category: "Operational Knowledge",
    summary: "Full operational knowledge base loaded into the brand agent. The agent can now answer detailed passenger questions about tickets, boarding, luggage, pets, car hire, excursions, and more.",
    capabilities: [
      "Knows both ticket classes in detail: Euro Class (Upper Deck, free seating) and Club Class (Bridge Deck, priority boarding, newspaper, OJ)",
      "Full vessel layout: 5 Upper Deck lounges, Bridge Deck, Hybleum shop, bars, pet cabin, facilities for reduced mobility",
      "Travel Made Simple policy: full refund 24h before, no no-show penalty, no name change fees, no date change fees within same fare",
      "Luggage rules by passenger type: foot passengers (3 bags + 1 hand luggage), car passengers (no restrictions)",
      "Four pet travel options with size limits, booking requirements, and weather restrictions",
      "Check-in times, required documents, minor travel rules, and document validity (incl. Italian Paper ID invalid from Aug 2026)",
      "Car hire in Pozzallo: vehicle groups, pricing, CDW options, refund policy",
      "Excursions by season: Syracuse, Ragusa Ibla, Taormina, Mt. Etna, and Malta in One Day",
      "Seasonal content intelligence: demand peaks, audience travel patterns, and month-by-month content opportunities",
    ],
  },
  {
    sortKey: "2026-04-16-e",
    date: "2026-04-16",
    category: "Approval & Learning",
    summary: "Content approval queue, rejection flow, and learning loop built. Preference data now injected into agent context before every content generation call.",
    capabilities: [
      "Agent approves and rejects posts one at a time, storing decisions in PostgreSQL",
      "Aggregates approval and rejection patterns over time — pillar, tone register, format, and market",
      "Surfaces active constraints automatically when a rejection reason appears 3 or more times",
      "Injects learned preferences into every brand-guidelines and social-expert content generation call silently",
      "Monthly Learning Summary card shows approved/rejected patterns and active constraints at the top of the Social Expert page",
      "Close Month archives all pending posts and logs a changelog entry summarising the month",
    ],
  },
  {
    sortKey: "2026-04-16-d",
    date: "2026-04-16",
    category: "Trend Adaptation",
    summary: "Trend Adaptation feature added to Social Media Expert page.",
    capabilities: [
      "Receive a trend as text, link, image, or any combination — analyse the core mechanic that makes it work",
      "Assess brand fit honestly — if the trend doesn't translate to a travel/ferry brand without feeling forced, declines to produce output",
      "Return one adapted content idea per applicable market (English, Italian, or both) when fit is confirmed",
      "Each idea includes a 2–3 line concept, a one-line explanation of why it works for VF, the target market, and the specific platform",
    ],
  },
  {
    sortKey: "2026-04-16-c",
    date: "2026-04-16",
    category: "Social Media Expert",
    summary: "Social Media Expert page built. Copy review, image review, and chat interface wired to OpenAI.",
    capabilities: [
      "Review copy against brand guidelines and return a structured verdict: On Brand / Needs Work / Off Brand",
      "Provide a plain-language explanation, specific suggestions, a rewritten version, and tone notes for any copy submitted",
      "Review images for brand fit using GPT-4o vision — same structured verdict output",
      "Maintain full conversational context within a chat session — follow-up questions build on previous answers",
      "Render markdown responses cleanly: tables, bullet lists, bold text, and structured plans",
    ],
  },
  {
    sortKey: "2026-04-16-b",
    date: "2026-04-16",
    category: "Brand Foundation",
    summary: "Brand guidelines system prompt added. Brand Identity and Social Media sections populated with real content.",
    capabilities: [
      "Agent now knows the full market structure: English market (Facebook, Maltese audience) and Italian market (Facebook + Instagram, Sicilian audience)",
      "Knows all four content pillars: Why VF, Why Sicily / Why Malta, VF Recommends, VF Experience",
      "Applies the correct tone register per context: Offer, Destination Spotlight, Operational, Cultural/Seasonal, UGC",
      "Follows the monthly briefing protocol — never produces a content plan without running a structured brief first",
      "Enforces promotional lead time rules: 4–6 weeks ahead, flags missed windows before outputting any plan",
      "Adapts trends to the VF brand with honest fit assessment — never forces output",
      "Cross-posting logic for Italian market: flags Cross-post Y/N with reasoning on every content piece",
      "Applies copy rules: banned words, exclamation mark discipline, CTA only when earned, register tuned by market",
    ],
  },
  {
    sortKey: "2026-04-16-a",
    date: "2026-04-16",
    category: "Initial Setup",
    summary: "Brand hub scaffolded with OpenAI brand agent, full brand identity, tone of voice guidelines, social media strategy, and content pillars for Virtu Ferries.",
    capabilities: [
      "Answer questions about Virtu Ferries brand identity, colours, fonts, and visual language",
      "Apply and explain the brand tone of voice — travel-forward, editorially sharp, warm but not gushing",
      "Generate on-brand social media content for Instagram, Facebook, X, and LinkedIn",
      "Advise on what to say and what not to say based on established messaging guidelines",
      "Provide context on the Malta–Sicily route, crossing time, and key brand messages",
    ],
  },
];
