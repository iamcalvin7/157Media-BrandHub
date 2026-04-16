export interface ChangelogEntryStatic {
  sortKey: string;
  date: string;
  category: string;
  summary: string;
  capabilities: string[];
}

export const knowledgeChangelog: ChangelogEntryStatic[] = [
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
