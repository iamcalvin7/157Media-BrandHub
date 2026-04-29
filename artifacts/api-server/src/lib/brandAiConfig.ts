const AI_CONTENT_GENERATION_CONFIGURED: Record<string, boolean> = {
  "virtu-ferries": true,
  "gozo-highspeed": true,
};

export function isAiContentGenerationConfigured(slug: string): boolean {
  return AI_CONTENT_GENERATION_CONFIGURED[slug] === true;
}

export function aiNotConfiguredResponse(brandSlug: string) {
  return {
    error: "ai_not_configured",
    message:
      "AI content generation isn't configured for this brand yet. " +
      "Please populate the brand's prompt configuration before using this feature.",
    brandSlug,
  };
}
