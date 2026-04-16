export interface ChangelogEntryStatic {
  sortKey: string;
  date: string;
  category: string;
  summary: string;
  capabilities: string[];
}

export const knowledgeChangelog: ChangelogEntryStatic[] = [
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
