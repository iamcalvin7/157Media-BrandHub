// Shared per-brand knowledge registry.
//
// SINGLE SOURCE OF TRUTH for every brand's structured content (history,
// identity, fleet, USPs, offers, travel info, social media reference, etc.).
//
// Both surfaces consume this:
//   - The brand hub web app uses it to render every page (via the
//     useBrandContent() hook in the client wrapper).
//   - The api-server's agent prompt builder injects a formatted version of
//     this data into the LLM system prompt (via formatBrandKnowledgeAsPrompt
//     from "./prompt"). This is the auto-feed guarantee: any field added or
//     edited here automatically becomes part of what the AI agent knows for
//     that brand — no second sync required.
//
// Virtu Ferries is fully populated. Gozo Highspeed is scaffolded with empty
// arrays so pages render "Not configured yet" until the team fills it in.

// ─── Types ──────────────────────────────────────────────────────────────────

export type TimelineEntry = {
  year: string;
  title: string;
  body: string;
  accent: string;
};

export type Vessel = {
  name: string;
  role: string;
  length: string;
  capacity: string;
  hull: string;
  inService: string;
  description: string;
  accent: string;
};

export type Stat = {
  iconName: "Users" | "Car" | "Calendar" | "TrendingUp" | "Anchor" | "Ship";
  value: string;
  label: string;
  color: string;
};

export type HeritageNote = {
  iconName: "Flag" | "Calendar" | "Globe" | "Anchor" | "Ship";
  title: string;
  body: string;
  color: string;
};

export type Sister = {
  kicker: string;
  title: string;
  description: string;
  details: { label: string; value: string }[];
};

export type BrandHistoryContent = {
  hero: { kicker: string; title: string; subtitle: string };
  stats: Stat[];
  timeline: TimelineEntry[];
  vessels: Vessel[];
  fleetSubtitle?: string;
  heritage: HeritageNote[];
  sister?: Sister;
};

export type BrandIdentityContent = {
  headerSubtitle: string;
  brandStory: string;
  toneOfVoice: string[];
  keyMessages: string[];
  whatToSay: string[];
  whatNotToSay: string[];
};

export type LogoFile = {
  label: string;
  description: string;
  src: string;
  file: string;
  filename: string;
  bg: string;
};

export type ColourSwatch = {
  name: string;
  hex: string;
  desc: string;
  className: string;
};

export type LogoMarkPart = {
  color: string;
  label: string;
};

export type TypographyBlock = {
  primaryFontName: string;
  weights: { weight: string; sample: string; className: string; usage: string }[];
};

export type AssetsContent = {
  headerSubtitle: string;
  logos: LogoFile[];
  colours: ColourSwatch[];
  logoMark?: { src: string; parts: LogoMarkPart[] };
  logoDos: string[];
  logoDonts: string[];
  typography?: TypographyBlock;
};

export type Platform = {
  name: string;
  handle: string;
  iconName: "Facebook" | "Instagram" | "Tiktok" | "Linkedin";
  cadence: string;
  colorClass: string;
};

export type Market = {
  market: string;
  audience: string;
  frame: string;
  note?: string;
  platforms: Platform[];
};

export type PillarOverview = {
  number: string;
  title: string;
  desc: string;
};

export type Register = {
  label: string;
  desc: string;
  example: string;
  color: string;
};

export type RecurringPost = {
  cadence: string;
  day?: string;
  title: string;
  what: string;
  market?: string;
  channel?: string;
  notes?: string;
};

export type SeasonalTheme = {
  season: "Spring" | "Summer" | "Autumn" | "Winter";
  months: string;
  iconName: "Flower2" | "Sun" | "Leaf" | "Snowflake";
  themes: string[];
};

export type SocialMediaContent = {
  headerSubtitle: string;
  markets: Market[];
  pillars: PillarOverview[];
  registers: Register[];
  crossPosting?: { when: string[]; platformSpecific: string[] };
  recurringPosts?: RecurringPost[];
  seasonalThemes?: SeasonalTheme[];
};

export type TravelInfoSection = {
  id: string;
  title: string;
  iconName:
    | "CreditCard" | "Clock" | "Luggage" | "Car" | "Dog"
    | "Accessibility" | "Truck" | "Bike" | "Ship" | "AlertTriangle"
    | "Sparkles";
  accent: string;
  intro?: string;
  bullets?: string[];
  notes?: { label: string; body: string }[];
  timetable?: {
    badge?: string;
    crossingMinutes?: number;
    outboundLabel: string;
    outboundTimes: string[];
    inboundLabel: string;
    inboundTimes: string[];
    legend?: { marker: string; meaning: string }[];
  };
};

export type OnboardSection = {
  id: string;
  title: string;
  iconName:
    | "Wifi" | "Crown" | "Coffee" | "Tv" | "Wind"
    | "Anchor" | "Sparkles" | "Armchair" | "Utensils";
  accent: string;
  intro?: string;
  bullets?: string[];
  notes?: { label: string; body: string }[];
};

export type OnboardExperienceContent = {
  headerKicker: string;
  headerTitle: string;
  headerSubtitle: string;
  sections: OnboardSection[];
  footer?: string;
};

export type ExcursionSchedule = {
  label: string;
  depMalta?: string;
  arrPozzallo?: string;
  depPozzallo?: string;
  arrMalta?: string;
};

export type ExcursionPricing = {
  adultEur: number;
  childEur: number;
  ageRange?: string;
  underFreeAge?: number;
  etsNote?: string;
  notes?: string[];
};

export type Excursion = {
  id: string;
  name: string;
  season: "Summer" | "Winter" | "Year-round";
  destinations: string[];
  description?: string;
  seasonDates?: string;
  minParticipants?: number;
  schedules?: ExcursionSchedule[];
  pricing?: ExcursionPricing;
  itinerary?: string[];
  localTransport?: string;
  operationalNotes?: string[];
};

export type ExcursionsHighlightGroup = {
  title: string;
  iconName: "Mountain" | "Utensils" | "Landmark";
  accent: string;
  items: string[];
};

export type ExcursionsContent = {
  headerKicker: string;
  headerTitle: string;
  headerSubtitle: string;
  intro?: string;
  highlightGroups: ExcursionsHighlightGroup[];
  excursions: Excursion[];
  closingNote?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

export type CustomerPromiseGroup = {
  id: string;
  title: string;
  iconName: "RefreshCw" | "BadgeCheck" | "Car" | "Wallet";
  accent: string;
  items: string[];
};

export type CustomerPromiseContent = {
  headerKicker: string;
  headerTitle: string;
  headerSubtitle: string;
  intro?: string;
  groups: CustomerPromiseGroup[];
  caveat?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

export type TravelInfoContent = {
  headerKicker: string;
  headerTitle: string;
  headerNote: string;
  sourceUrl?: string;
  sourceLabel?: string;
  termsUrl?: string;
  contacts: {
    phoneLabel: string;
    phoneTarget: string;
    phoneHref: string;
    emailLabel: string;
    emailTarget: string;
    emailHref: string;
  } | null;
  sections: TravelInfoSection[];
  footer?: string;
};

export type USPSection = {
  title: string;
  color: string;
  items: string[];
};

export type USPContent = {
  headerKicker: string;
  headerSubtitle: string;
  sections: USPSection[];
};

export type OfferPrice = {
  label: string;
  value: string;
  iconName: "Users" | "Car" | "Bike" | "Truck";
};

export type Offer = {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  validity: string;
  hook: string;
  prices: OfferPrice[];
  schedule?: { label: string; value: string }[];
  notes: string[];
};

export type ContentNote = {
  title: string;
  body: string;
  color: string;
};

export type OffersContent = {
  headerSubtitle: string;
  offers: Offer[];
  notes: ContentNote[];
};

export type ResourcesContent = {
  guidelinesPdf: { name: string; description: string; path: string; filename: string } | null;
  cheatSheetEnabled: boolean;
  vault: { name: string; type: string; size: string; iconName: "Folder" | "FileText" | "Image" | "Video" }[];
  vaultUnderConstruction: boolean;
};

export type MonthlyPlanningContent = {
  pillarsEnglish: { num: string; title: string; desc: string }[];
  pillarsItalian: { num: string; title: string; desc: string }[];
  offersSnapshot: { name: string; detail: string }[];
  markets: { label: string; channels: string }[];
  englishMarketLabel: string;
  italianMarketLabel: string;
  englishAudienceLine: string;
  italianAudienceLine: string;
};

export type AgentVariant = {
  value: string;
  label: string;
};

export type SocialMediaExpertContent = {
  platforms: AgentVariant[];
};

export type ContentIdeasContent = {
  themes: string[];
};

export type CopywriterContent = {
  promptPlaceholderEn: string;
  promptPlaceholderIt: string;
};

export type SicilyTown = {
  name: string;
  description: string;
};

export type SicilyTownGroup = {
  bracket: string;
  intro?: string;
  towns: SicilyTown[];
};

export type SicilyTownsContent = {
  headerKicker: string;
  headerTitle: string;
  headerSubtitle: string;
  intro?: string;
  groups: SicilyTownGroup[];
  footer?: string;
};

export type BrandContent = {
  // Display label for the hub itself ("Brand Hub", "Brand Center", etc.)
  hubLabel: string;
  // Short brand label used in headers / footers
  brandShortLabel: string;
  // The legal / display name used in copy ("Virtu Ferries")
  brandDisplayName: string;
  history: BrandHistoryContent;
  identity: BrandIdentityContent;
  assets: AssetsContent;
  socialMedia: SocialMediaContent;
  travelInfo: TravelInfoContent;
  onboardExperience: OnboardExperienceContent;
  usp: USPContent;
  offers: OffersContent;
  excursions?: ExcursionsContent;
  customerPromise?: CustomerPromiseContent;
  resources: ResourcesContent;
  sicilyTowns?: SicilyTownsContent;
  monthlyPlanning: MonthlyPlanningContent;
  socialMediaExpert: SocialMediaExpertContent;
  contentIdeas: ContentIdeasContent;
  copywriter: CopywriterContent;
};

// ─── Virtu Ferries content (preserved verbatim from the original pages) ─────

const VIRTU_BLUE = "#1e82b4";
const VIRTU_AMBER = "#f6a610";
const VIRTU_RED = "#e01814";

const VIRTU_FERRIES: BrandContent = {
  hubLabel: "Brand Hub",
  brandShortLabel: "Virtu Ferries",
  brandDisplayName: "Virtu Ferries",
  history: {
    hero: {
      kicker: "Est. 1988",
      title: "36 years connecting two islands.",
      subtitle:
        "Virtu Ferries was founded in Malta in 1988 with a single conviction — that the crossing between Malta and Sicily deserved something faster, more reliable, and worth making. We've been proving that ever since.",
    },
    stats: [
      { iconName: "Users", value: "250,000+", label: "passengers per year", color: VIRTU_BLUE },
      { iconName: "Car", value: "25,000+", label: "vehicles carried per year", color: VIRTU_AMBER },
      { iconName: "Calendar", value: "36+", label: "years of continuous operation", color: VIRTU_RED },
      { iconName: "TrendingUp", value: "365", label: "days a year, almost daily", color: VIRTU_BLUE },
    ],
    timeline: [
      {
        year: "1988",
        title: "Founded in Malta",
        body: "Virtu Ferries established in Marsa, Malta. One catamaran. One route. A conviction that the crossing between Malta and Sicily deserved something faster.",
        accent: VIRTU_BLUE,
      },
      {
        year: "2001",
        title: "Venezia Lines founded",
        body: "The Adriatic extension — Venezia Lines established to bring the same high-speed catamaran model to the North Adriatic. First commercial service launched May 2003.",
        accent: VIRTU_AMBER,
      },
      {
        year: "2010",
        title: "Jean de La Valette enters service",
        body: "Named after the Grand Master who commanded the Great Siege of Malta, the Jean de La Valette becomes the fleet's flagship — 106.5m, 800 passengers.",
        accent: VIRTU_BLUE,
      },
      {
        year: "2019",
        title: "Saint John Paul II — new flagship",
        body: "The largest vessel in the fleet joins in March 2019. 110m, 900 passengers, Incat 089 hull. The Saint John Paul II takes over as flagship and sets a new standard for the crossing.",
        accent: VIRTU_AMBER,
      },
      {
        year: "Today",
        title: "36+ years. 250,000+ passengers a year.",
        body: "One of the longest-serving transport institutions in Malta. One of the few year-round high-speed ferry services in the Mediterranean. Still the fastest way between the two islands.",
        accent: VIRTU_RED,
      },
    ],
    fleetSubtitle:
      "Valletta Grand Harbour → Pozzallo, Sicily — exclusively catamarans, all vessels flying the Maltese flag.",
    vessels: [
      {
        name: "Saint John Paul II",
        role: "Flagship",
        length: "110m",
        capacity: "900 passengers",
        hull: "Incat 089",
        inService: "March 2019",
        description:
          "The newest and largest vessel in the Virtu Ferries fleet. Named after the beloved Polish Pope who visited Malta in 1990, the Saint John Paul II brought a step-change in capacity and comfort to the Valletta–Pozzallo route.",
        accent: VIRTU_BLUE,
      },
      {
        name: "Jean de La Valette",
        role: "Fleet vessel",
        length: "106.5m",
        capacity: "800 passengers",
        hull: "—",
        inService: "2010",
        description:
          "Named after Jean Parisot de la Valette, Grand Master of the Knights of Malta during the Great Siege of 1565. The city of Valletta — and the ferry route it anchors — bears his legacy.",
        accent: VIRTU_AMBER,
      },
    ],
    heritage: [
      {
        iconName: "Flag",
        title: "Maltese-flagged",
        body: "Every vessel flies the Maltese flag. For the English market — predominantly Maltese passengers — this is a point of quiet pride worth naming.",
        color: VIRTU_BLUE,
      },
      {
        iconName: "Calendar",
        title: "Year-round, not seasonal",
        body: "Almost every high-speed ferry service in the Mediterranean stops for winter. Virtu doesn't. That consistency is a genuine differentiator — and a content angle.",
        color: VIRTU_AMBER,
      },
      {
        iconName: "Globe",
        title: "Mainstream, not niche",
        body: "250,000+ passengers a year means this isn't a discovery — it's an institution. Content should feel familiar and trusted, never like it's pitching a hidden secret.",
        color: VIRTU_RED,
      },
      {
        iconName: "Anchor",
        title: "36 years — use it sparingly",
        body: "Heritage is credibility, not marketing gloss. Drop the founding year or vessel history into content when it earns its place — never as a lead.",
        color: VIRTU_BLUE,
      },
    ],
    sister: {
      kicker: "Adriatic subsidiary — Virtu Holdings",
      title: "North Adriatic routes, April – October",
      description:
        "Founded in 2001, with first commercial service in May 2003. Venezia Lines brings the Virtu high-speed catamaran model to the Adriatic — connecting Venice and the Croatian coast through the summer season.",
      details: [
        { label: "Founded", value: "2001" },
        { label: "First service", value: "May 2003" },
        { label: "Season", value: "April – October" },
        { label: "Fleet type", value: "High-speed catamaran" },
      ],
    },
  },
  identity: {
    headerSubtitle:
      "We are the high-speed connection between Malta and Sicily. Our voice is travel-forward, confident, and editorially sharp.",
    brandStory:
      "Virtu Ferries has been connecting Malta and Sicily for decades. Not just two ports — two cultures, two ways of life, two islands that have more in common than most people realise. The crossing takes 1 hour 45 minutes. What you discover on the other side stays with you longer.",
    toneOfVoice: [
      "Travel-forward and editorially sharp. Warm but not gushing. Confident but not corporate.",
      "Economy of language — no filler, no clichés. Feels like a well-travelled friend, not a brand account.",
    ],
    keyMessages: [
      "The fastest way between Malta and Sicily",
      "Travel by foot or bring your car",
      "A crossing worth making, not just taking",
      "Two islands. One ferry. Endless reasons to go.",
    ],
    whatToSay: [
      "Specific place names, food, seasons, cultural moments",
      "Short, confident sentences with real rhythm",
      "Copy that earns the reader's time",
      "Platform-native language that doesn't feel scheduled",
    ],
    whatNotToSay: [
      '"Paradise", "breathtaking", "unforgettable", "hidden gem"',
      "Generic travel language that could belong to any brand",
      "Pushy CTAs that treat the audience like a conversion target",
      "Exclamation marks used for enthusiasm rather than meaning",
    ],
  },
  assets: {
    headerSubtitle: "The visual components that make up the Virtu Ferries brand.",
    logos: [
      {
        label: "Full Colour",
        description: "The primary version — works on both light and dark backgrounds",
        src: "/logo.png",
        file: "/logo.png",
        filename: "virtu-ferries-logo-colour.png",
        bg: "bg-gray-50 border border-gray-200",
      },
      {
        label: "White / Reversed",
        description: "For use on dark photographic or colour backgrounds",
        src: "/virtu-ferries-logo.png",
        file: "/virtu-ferries-logo.png",
        filename: "virtu-ferries-logo-white.png",
        bg: "bg-gray-900",
      },
      {
        label: "Element Overlay",
        description: "Social media story overlay — English market",
        src: "/element-overlay.png",
        file: "/element-overlay.png",
        filename: "virtu-ferries-element-overlay.png",
        bg: "bg-black border border-gray-200",
      },
      {
        label: "Element Overlay — Italian",
        description: "Social media story overlay — Italian market",
        src: "/element-overlay-it.png",
        file: "/element-overlay-it.png",
        filename: "virtu-ferries-element-overlay-it.png",
        bg: "bg-black border border-gray-200",
      },
    ],
    colours: [
      { name: "Primary Blue", hex: VIRTU_BLUE, desc: "Mediterranean — primary CTA, links, UI", className: "bg-[#1e82b4]" },
      { name: "Secondary Amber", hex: VIRTU_AMBER, desc: "Warm Gold — accents, highlights", className: "bg-[#f6a610]" },
      { name: "Accent Red", hex: VIRTU_RED, desc: "Vivid Red — urgency, alerts, logo mark", className: "bg-[#e01814]" },
      { name: "Off White", hex: "#f5f5f5", desc: "Light Surface — page backgrounds", className: "bg-[#f5f5f5] border border-gray-200" },
      { name: "Deep Navy", hex: "#0d1b2a", desc: "Dark text and reversed contexts", className: "bg-[#0d1b2a]" },
    ],
    logoMark: {
      src: "/logo.png",
      parts: [
        { color: VIRTU_RED, label: "Red V — speed, strength, direction" },
        { color: VIRTU_AMBER, label: "Amber curve — warmth, hospitality, connection" },
        { color: VIRTU_BLUE, label: "Blue waves — the Mediterranean, movement" },
      ],
    },
    logoDos: [
      "Use the full-colour version on dark or neutral backgrounds",
      "Use the white reversed version on photographic or coloured backgrounds",
      "Maintain generous clear space — at least the height of the F in FERRIES",
      "Use only the supplied files — do not recreate the logo",
    ],
    logoDonts: [
      "Stretch, skew, or distort the logo in any dimension",
      "Place on busy photographic backgrounds without sufficient contrast",
      "Change any of the logo colours to unofficial values",
      "Add outlines, shadows, or effects not in the supplied files",
    ],
    typography: {
      primaryFontName: "Montserrat",
      weights: [
        {
          weight: "Light 300",
          sample: "An hour and forty‑five minutes by sea.",
          className: "font-light text-gray-600 text-xl leading-snug",
          usage: "Long-form body copy, captions, microcopy. Use for editorial paragraphs and supporting text where the tone should feel calm and unhurried.",
        },
        {
          weight: "Regular 400",
          sample: "Daily crossings, Malta to Sicily.",
          className: "font-normal text-gray-700 text-2xl leading-snug",
          usage: "Default UI weight: nav links, form labels, table cells, buttons. Use whenever copy needs to be neutral and readable.",
        },
        {
          weight: "Bold 700",
          sample: "Book your crossing.",
          className: "font-bold text-gray-900 text-3xl leading-tight tracking-tight",
          usage: "Section headings, eyebrow titles, primary CTAs. Use when an element must lead the eye but doesn't yet need the full hero treatment.",
        },
        {
          weight: "ExtraBold 800",
          sample: "Malta ↔ Sicily in 1h45.",
          className: "font-extrabold text-gray-900 text-5xl leading-[0.95] tracking-tighter",
          usage: "Hero headlines, page H1s, billboard claims. Reserve for the single most important line on the screen — never use for body copy.",
        },
      ],
    },
  },
  socialMedia: {
    headerSubtitle: "Two markets, three platforms. Each with its own audience, frame, and creative register.",
    markets: [
      {
        market: "Maltese Market",
        audience: "Maltese locals and international English speakers",
        frame: "Malta as home base. Sicily as the irresistible neighbour.",
        note: "Instagram reuses Facebook content where possible. Platform-specific IG content is created when the Facebook post relies on a link or doesn't translate to Instagram format. All Instagram copy is in English, angled for the Maltese audience.",
        platforms: [
          { name: "Facebook", handle: "facebook.com/virtuferries", iconName: "Facebook", cadence: "25 posts per month", colorClass: "text-blue-400" },
          { name: "Instagram", handle: "instagram.com/virtuferrieslimited", iconName: "Instagram", cadence: "25 posts per month", colorClass: "text-pink-400" },
        ],
      },
      {
        market: "Italian Market",
        audience: "Sicilians and Italian travellers",
        frame: "Sicily as home. Malta as the discovery they didn't know they needed.",
        note: "Italian market is Facebook only. No Instagram. All copy in Italian.",
        platforms: [
          { name: "Facebook", handle: "facebook.com/levacanzeMaltesi", iconName: "Facebook", cadence: "25 posts per month", colorClass: "text-blue-400" },
        ],
      },
    ],
    pillars: [
      { number: "01", title: "Choose Virtu", desc: "Make Virtu Ferries the preferred travel option. Reasons to choose us — speed, comfort, convenience, car flexibility, pet travel, no airport friction, onboard comfort, luggage freedom, the ease of the crossing." },
      { number: "02", title: "Choose Sicily / Choose Malta", desc: "Create destination demand. Reasons to visit — beaches, food, culture, nature, towns, events, public holidays, seasonal travel moments. Use 'Choose Sicily' on Malta-facing channels, 'Choose Malta' on Italy-facing channels." },
      { number: "03", title: "Virtu Recommends", desc: "Help people plan the trip. Curated travel content — restaurants, towns, trails, day plans, itineraries, seasonal ideas, events, shopping stops, practical recommendations." },
      { number: "04", title: "The Crossing", desc: "Make the journey part of the story. The Virtu Ferries journey — onboard experience, crew stories, passenger UGC, views from the deck, real crossings, arrivals, departures, car boarding, pet travel, the feeling of travelling by sea." },
      { number: "05", title: "The Community", desc: "Keep the audience involved. Trends, reposts, polls, questions, giveaways, UGC, comments-led posts, participation content, reactive social moments." },
      { number: "06", title: "Flexible / Operational", desc: "Reserved for required schedules, operational posts, and service information — never used for editorial. Includes the weekly Saturday schedule, disruption notices, and route updates." },
    ],
    registers: [
      {
        label: "Offer / Promotion",
        desc: "Confident, direct, tip-from-a-friend energy. Lead with value, not the discount.",
        example: '"Malta this weekend. Adults from €63.60 return. Go."',
        color: VIRTU_AMBER,
      },
      {
        label: "Destination Spotlight",
        desc: "Editorial, sensory, no superlatives. Like a well-travelled friend texting about a place they just found.",
        example: '"Modica doesn\'t have a beach. It doesn\'t need one."',
        color: VIRTU_BLUE,
      },
      {
        label: "Operational / Disruption",
        desc: "Clear, calm, human. Acknowledge briefly, then focus on what passengers need to know and do.",
        example: '"Today\'s 10:00 from Pozzallo has been cancelled due to adverse weather. Here\'s what to do next."',
        color: VIRTU_RED,
      },
      {
        label: "Cultural / Seasonal",
        desc: "Warm, present-tense, platform-native. Feels like it belongs to this moment, not scheduled six weeks ago.",
        example: '"It\'s April in Sicily. That\'s all."',
        color: VIRTU_BLUE,
      },
    ],
    crossPosting: {
      when: ["Destination-led content", "Seasonal moments", "Experiential posts where format works on both platforms"],
      platformSpecific: ["Reels — Instagram only", "Link-heavy posts — Facebook only", "Fit is clearly better on one platform"],
    },
    recurringPosts: [
      {
        cadence: "Weekly",
        day: "Saturday",
        title: "Weekly Schedule",
        what: "Posted every Saturday — the next week's full sailing schedule (Monday → Sunday). Both directions, both ports, every crossing time, with any cancellations or weather flags called out clearly.",
        market: "Both markets",
        channel: "Facebook (Maltese + Italian) and Instagram (Maltese)",
        notes: "Treated as service content, not promotional. Use the Operational / Disruption register: clear, calm, scannable. Date range in the header (e.g. 'Mon 25 May – Sun 31 May'). Same post adapted per market — Italian copy on the Italian Facebook page.",
      },
    ],
    seasonalThemes: [
      {
        season: "Spring",
        months: "Mar–May",
        iconName: "Flower2",
        themes: ["Nature", "Parks", "Mountains", "Blooming Sicily", "Easter", "Fresh starts"],
      },
      {
        season: "Summer",
        months: "Jun–Aug",
        iconName: "Sun",
        themes: ["Sea", "Beaches", "Heat", "Festivals", "Summer body content"],
      },
      {
        season: "Autumn",
        months: "Sep–Nov",
        iconName: "Leaf",
        themes: ["Food harvest", "Wine", "Quieter Sicily", "Softer light"],
      },
      {
        season: "Winter",
        months: "Dec–Feb",
        iconName: "Snowflake",
        themes: ["Festive Sicily", "Etna snow", "Christmas markets", "New Year"],
      },
    ],
  },
  travelInfo: {
    headerKicker: "Operational reference",
    headerTitle: "Travel Info",
    headerNote:
      "Authoritative passenger information drawn from virtuferries.com/travel-info/5. Use this as the source of truth when writing service-led content, replying to passenger questions, or briefing the team. The AI agent has the same rules baked into its knowledge.",
    sourceUrl: "https://www.virtuferries.com/travel-info/5",
    sourceLabel: "virtuferries.com/travel-info/5",
    termsUrl: "https://www.virtuferries.com/terms_and_conditions/23",
    contacts: {
      phoneLabel: "Book by phone",
      phoneTarget: "Contact Virtu Ferries",
      phoneHref: "https://www.virtuferries.com/contact_us/13",
      emailLabel: "Book by email",
      emailTarget: "reservations@virtuferries.com",
      emailHref: "https://www.virtuferries.com/contact_us/13",
    },
    sections: [
      {
        id: "booking",
        title: "Before You Travel",
        iconName: "CreditCard",
        accent: VIRTU_BLUE,
        intro:
          "Bookings can be made online, by phone or by email — same price across all channels. Book early: space on the high-speed ferry is limited.",
        bullets: [
          "Advance reservations: payment within 48 hrs of booking",
          "Bookings within 3 days of departure: paid the same day",
          "Online bookings: paid immediately",
          "Unpaid reservations are auto-cancelled without prior notice",
        ],
        notes: [
          {
            label: "Info needed for passengers",
            body: "Full name & surname, date of birth, ID/passport number, nationality, mobile number, email address.",
          },
          {
            label: "Info needed for vehicles",
            body: "Make, model & registration number.",
          },
        ],
      },
      {
        id: "foot",
        title: "Foot Passengers",
        iconName: "Clock",
        accent: VIRTU_AMBER,
        bullets: [
          "Arrive at the terminal 1 hour before scheduled departure",
          "Check-in opens 2 hours before departure",
          "Check-in closes 30 minutes before departure",
        ],
      },
      {
        id: "luggage",
        title: "Personal Luggage",
        iconName: "Luggage",
        accent: VIRTU_BLUE,
        bullets: [
          "Up to 3 pieces of personal baggage per passenger",
          "Each piece up to 50 × 40 × 80 cm (170 linear cm)",
          "Stowed in baggage trolley or vessel storage as directed by crew",
          "Plus 1 hand luggage carried to your seat: max 37 × 45 × 25 cm and ≤ 5 kg",
        ],
      },
      {
        id: "car",
        title: "Travelling by Private Car",
        iconName: "Car",
        accent: VIRTU_AMBER,
        intro:
          "Pack your car, hop in, and away you go. No restrictions on personal luggage in your car — sports gear and family pets included. Illegal or dangerous goods are not allowed.",
        bullets: [
          "Arrive at the terminal 90 minutes before scheduled departure",
          "Loading order is at the discretion of the Master and Duty Officer (safety & logistics, not first-come)",
          "Caravans: charged at non-commercial light vehicle tariffs",
        ],
      },
      {
        id: "pets",
        title: "Accompanied Pets",
        iconName: "Dog",
        accent: VIRTU_RED,
        intro:
          "Pets must be declared at booking and carry a valid pet passport with all required vaccinations. Notify the crew on boarding. Pets are not allowed on coach transfers (except guide dogs). We recommend evening or early-morning sailings when temperatures are cooler.",
        bullets: [
          "Pet Cabin — A/C insulated cabin in the vehicle garage. Cages provided by Virtu Ferries. Water/food supplied by owner. Charged. Pre-book required. Max 1 pet per cage.",
          "Cage 1: 60 × 80 × 60 cm   ·   Cages 2–4: 73 × 102 × 76.5 cm   ·   Cages 5–7: 105 × 115 × 90 cm",
          "Pets in Vehicles — kept inside the car with windows open. First 3 pets in a vehicle are free of charge.",
          "Pets on outside deck — cats & dogs only, in a leak-proof cage max 91 × 64 × 67.5 cm. Owner must accompany throughout the voyage. Leash + muzzle when transiting passenger areas. Charged.",
          "Small pets in passenger areas — cats & dogs only, leak-proof carrier max 70 × 50 × 51.5 cm. Must remain inside carrier, on the floor next to the seat (never on tables/seats).",
        ],
        notes: [
          {
            label: "Service & Guide Dogs",
            body:
              "Welcome on board. Must be certified by Assistance Dogs International (ADI) or the International Guide Dogs Federation (IGDF). Must wear an identifying jacket and harness throughout the voyage.",
          },
          {
            label: "Pets are NOT allowed in passenger saloons or common areas",
            body:
              "Exceptions: small pets in carriers (rule above) and guide dogs. The Master may permit owners to visit pets in the garage or pet cabin during the voyage, accompanied by crew.",
          },
          {
            label: "Veterinary contacts — Malta",
            body:
              "Veterinary Regulation Directorate · +356 9917 0532 · petstravel.mafa@gov.mt — contact before booking if in doubt.",
          },
          {
            label: "Veterinary contacts — Pozzallo",
            body:
              "Ufficio Sanità Pubblica Veterinaria, Ragusa · +39 0932 234958 / 960 / 613 · igiene.allevamenti@asp.rg.it",
          },
        ],
      },
      {
        id: "accessibility",
        title: "Facilities for Persons with Special Needs",
        iconName: "Accessibility",
        accent: VIRTU_BLUE,
        intro:
          "The high-speed ferry is equipped with ramps, a lift and a toilet for persons with special needs. Euro Class and Club Class lounges are also accessible by lift.",
        bullets: [
          "Crew on board are happy to assist — speak to a crew member at any time",
          "We recommend notifying us at the time of booking so we can plan ahead",
          "Disability Card holders accommodated",
        ],
      },
      {
        id: "club-class",
        title: "Club Class",
        iconName: "Sparkles",
        accent: VIRTU_AMBER,
        intro:
          "Club Class is the premium passenger experience aboard the high-speed ferry — a quieter, dedicated saloon for travellers who want a touch more comfort on the crossing.",
        bullets: [
          "Premium dedicated saloon with upgraded seating",
          "Club Class lounge accessible by lift (also serves passengers with reduced mobility)",
          "Complimentary Starlink Wi-Fi voucher — covers the 2-hour Internet & Streaming package on every Club Class ticket",
        ],
        notes: [
          {
            label: "Why mention this in copy",
            body:
              "Use Club Class as the upsell anchor for premium audiences (couples, business travellers, families wanting calm). The free Starlink Wi-Fi voucher is now part of the value bundle — not a paid add-on.",
          },
        ],
      },
      {
        id: "commercial",
        title: "Commercial Vehicles",
        iconName: "Truck",
        accent: VIRTU_AMBER,
        intro:
          "Drivers of commercial vehicles have a designated lounge reserved for them — feel free to use it.",
        bullets: [
          "Dangerous goods are governed by the IMDG Code — see Conditions of Carriage for details",
        ],
      },
      {
        id: "bike",
        title: "Me & My Bicycle",
        iconName: "Bike",
        accent: VIRTU_RED,
        intro:
          "Your bicycle travels free, subject to space being available. Please notify Virtu Ferries at the time of booking that you have an accompanying bicycle.",
      },
    ],
    footer:
      "Source — virtuferries.com/travel-info/5 · Always cross-check with the live site before publishing customer-facing copy.",
  },
  onboardExperience: {
    headerKicker: "Onboard amenities",
    headerTitle: "Onboard Experience",
    headerSubtitle:
      "Everything passengers can use, do, and enjoy during the 1h 45m crossing — boarding, decks and lounges, outside seating, food & drink, family / car / pet travel, and connectivity. Source of truth for service-led copy and answers.",
    sections: [
      {
        id: "connectivity",
        title: "Connectivity — Satellite Wi-Fi powered by Starlink",
        iconName: "Wifi",
        accent: VIRTU_BLUE,
        intro:
          "Satellite Wi-Fi powered by Starlink is now available on the entire Malta ↔ Sicily crossing. One single, comprehensive package covers all online needs — browsing, email, work, and streaming.",
        bullets: [
          "Internet & Streaming Package — €4.00 for 2 hours of full internet access, including streaming services (video, music, apps)",
          "Available across the full crossing — connect, work, watch, or chat throughout the 1h 45m sailing",
          "Powered by Starlink low-earth-orbit satellites — engineered for open-sea coverage",
        ],
        notes: [
          {
            label: "How to talk about it",
            body:
              "Lead with the user benefit (\"stay connected the whole way across\"), not the technology. Always pair the €4 / 2-hour package with the Club Class perk so passengers see both options at once.",
          },
        ],
      },
      {
        id: "club-class",
        title: "Club Class — premium experience",
        iconName: "Crown",
        accent: VIRTU_AMBER,
        intro:
          "Club Class is the premium tier on board: dedicated saloon on the Bridge Deck, upgraded reclining seats with footrest, dedicated check-in desk and priority embarkation/disembarkation, complimentary orange juice and a newspaper, plus a complimentary Wi-Fi voucher in every ticket.",
        bullets: [
          "Dedicated Club Lounge on the Bridge Deck with reclining seats and footrests, opening onto its own Outside Seating Area with panoramic sea views",
          "Dedicated Club check-in desk and priority disembarkation; cars in Club are directed to a priority embarkation lane",
          "Complimentary orange juice and a newspaper on boarding",
          "Lounge accessible by lift",
          "Complimentary voucher for the 2-hour Starlink Internet & Streaming package — included with every Club Class ticket",
          "Last-minute upgrades possible on board — just ask a member of the cabin crew, the cost is minimal",
        ],
        notes: [
          {
            label: "Positioning",
            body:
              "Frame Club Class as a small uplift in price for a noticeably calmer, more comfortable crossing. The free Starlink voucher is the new headline benefit — feature it prominently in upgrade copy.",
          },
          {
            label: "Commercial vehicles in Club",
            body:
              "Commercial vehicles booked in Club Class are NOT assigned a place in the Club Vehicle lane — be precise about this when answering trade enquiries.",
          },
        ],
      },
      {
        id: "boarding",
        title: "Boarding the vessel",
        iconName: "Anchor",
        accent: VIRTU_BLUE,
        intro:
          "After check-in, passengers walk to the vessel through one final identity check. Luggage goes on the luggage trolley — only hand luggage is allowed in passenger areas.",
        bullets: [
          "Vessel entrance is on the Main Deck (the garage deck)",
          "Take the accommodation gangway stairs from the quay up to the Main Deck",
          "Stairs and a lift connect the Main Deck up to the Upper Deck — ask the Cabin Crew to use the lift",
          "Passengers with reduced mobility, pushchairs, or assistance needs board on the Main Deck via the ship's garage ramp — tell a member of staff at check-in",
        ],
        notes: [
          {
            label: "Lift etiquette",
            body:
              "Please do not use the lift unnecessarily. Senior citizens, passengers with mobility difficulties, and parents with pushchairs depend on it during embarkation and disembarkation.",
          },
        ],
      },
      {
        id: "decks-lounges",
        title: "Decks, lounges and seating",
        iconName: "Armchair",
        accent: VIRTU_AMBER,
        intro:
          "The Saint John Paul II is laid out across two passenger decks. Seating is free choice in every lounge — pick whichever spot suits the journey. Seating capacity has been deliberately scaled down to 800 (the vessel can technically take 1,000) for passenger comfort, with outdoor seating over and above that.",
        bullets: [
          "Upper Deck — five lounges: Fore Lounge (front), Aft Lounge (rear), Starboard Lounge (right), Port Lounge (left), and the St. Elmo Lounge amidships, reserved for commercial vehicle drivers",
          "The rear of the Upper Deck opens onto the Outside Seating Area",
          "Bridge Deck — the exclusive Club Lounge, opening onto its own Outside Seating Area",
          "Most seats are reclining; a small number of armchairs and sofas are also available",
        ],
        notes: [
          {
            label: "Best sea views",
            body: "The Fore Lounge has the best sea views of any indoor space.",
          },
          {
            label: "Most stable seats in rougher weather",
            body:
              "In adverse sea conditions the most stable area is the Starboard and Port Lounges — specifically the seats furthest from the windows.",
          },
          {
            label: "Picking your spot",
            body:
              "Group seats round a table are perfect when meeting friends. Need to walk a baby? Plenty of spacious aisles — and proper baby changing facilities are on board.",
          },
        ],
      },
      {
        id: "relax-on-board",
        title: "Relax on board — outside seating, shop and entertainment",
        iconName: "Sparkles",
        accent: VIRTU_RED,
        intro:
          "The Outside Seating Areas are open to passengers throughout the voyage. Leaving Valletta you get a full view of one of the most beautiful natural harbours in the world — the fortifications, church domes and steeples of Valletta and the Three Cities. Leaving Pozzallo you get a parting view of the Sicilian coast as far as the eye can see.",
        bullets: [
          "Hybleum, the on-board shop — extensive range of fragrances (female and male) at competitive prices, plus souvenirs, toys, wines and spirits, and costume jewellery",
          "Perfume prices on board are 20% less than in shops, with packages only available in restricted travel retail areas",
          "Coach tickets to Sicilian towns and cities, and taxi bookings to anywhere, can both be arranged at Hybleum",
          "Slot machines on board — strictly regulated to local and international norms",
          "On-board movies on a proper screen for passengers who'd rather just sit back",
        ],
        notes: [
          {
            label: "Outside Seating in Pozzallo and Valletta",
            body:
              "Watching the Grand Harbour fade out of view from the Outside Seating Area is, in Virtu's own words, \"a real must.\" Use this scene-setting in editorial / experience-led copy — it's one of the most evocative moments of the crossing.",
          },
        ],
      },
      {
        id: "cafeterias-bars",
        title: "Cafeterias and bars",
        iconName: "Coffee",
        accent: VIRTU_AMBER,
        intro:
          "Three Cafeterias / Bars on board — one in the Fore Lounge, one in the Aft Lounge, and one in Club. Hot and cold snacks, soft drinks, plus a range of wines and spirits.",
        bullets: [
          "Three full bars across the vessel",
          "Hot snacks, cold snacks, soft drinks, wines and spirits",
          "Every bar offers a selection of sweet and savoury gluten-free products",
        ],
        notes: [
          {
            label: "Menu",
            body:
              "A full bar menu is available on the Virtu Ferries website — link customers to it when answering food/dietary queries rather than quoting items from memory.",
          },
        ],
      },
      {
        id: "travelling-with",
        title: "Travelling with children, your car and your pet",
        iconName: "Wind",
        accent: VIRTU_BLUE,
        intro:
          "Three of the most common booking enquiries — families, car travellers, and pet owners — each have their own onboard rhythm.",
        bullets: [
          "Children must be supervised by an adult at all times, including in the Outside Seating Area — for their safety and other passengers' comfort",
          "Nappy changer on board — ask the Cabin Crew",
          "Free colour crayons and colouring material from the Cabin Crew, for the child to keep",
          "Car travellers don't need to leave the vehicle to check in — Port Staff complete check-in with you behind the wheel",
          "On arrival, drivers are called over the vessel's PA System to proceed to the garage ahead of other disembarking passengers — use the Main Deck exit closest to your car (three exits: Starboard Lounge, Port Lounge, far end of Aft Lounge)",
          "Pet owners must inform a member of staff at check-in AND a member of the Cabin Crew on boarding",
        ],
        notes: [
          {
            label: "Pet policy reference",
            body:
              "Always link or refer pet-travel enquiries to the published Pet Policy on virtuferries.com — it covers cabins, in-vehicle, outside-deck, and small-pets-in-carrier rules in detail.",
          },
          {
            label: "If you don't like having children around",
            body:
              "There is plenty of space on board to move to a different lounge or take a walk on deck — passengers should not feel obliged to make it obvious.",
          },
        ],
      },
      {
        id: "practical-info",
        title: "Practical info on board",
        iconName: "Tv",
        accent: VIRTU_RED,
        intro:
          "The Purser and the Cabin Crew are at your service for anything else during the crossing.",
        bullets: [
          "Smoking is not permitted anywhere on the vessel except in the designated area in the Outside Seating Area",
          "Mobile charging — designated charging points, ask the Cabin Crew",
          "Laptops and mobile phones can be used freely (mobiles work when in range)",
          "On-board entertainment plays on a proper screen",
          "Toilets are spacious and available throughout the voyage",
          "Passengers with reduced mobility — plenty of space, lift available from the garage to passenger lounges; tell us at check-in and the crew will help pick a suitable seat",
        ],
        notes: [
          {
            label: "If you need anything",
            body:
              "Direct passengers to the Purser or any Cabin Crew member — that's the published, intended single point of contact during the crossing.",
          },
        ],
      },
    ],
    footer:
      "When writing about Wi-Fi, be precise: it is paid (€4 / 2 hours, includes streaming) for standard tickets and complimentary for Club Class. Do not describe it as \"free Wi-Fi for everyone\". Source — virtuferries.com 'Off We Go' onboard guide; cross-check with the live site before publishing customer-facing copy.",
  },
  usp: {
    headerKicker: "Why Virtu Ferries",
    headerSubtitle:
      "Everything that makes Virtu Ferries the obvious choice — and the language we use to say so.",
    sections: [
      {
        title: "The Route",
        color: VIRTU_BLUE,
        items: [
          "Malta (Valletta Grand Harbour) ↔ Sicily (Pozzallo / Catania)",
          "90 km crossing — 1 hour 45 minutes",
          "Year-round service",
          "The only direct, scheduled high-speed ferry link between the two islands",
        ],
      },
      {
        title: "Speed & Convenience",
        color: VIRTU_BLUE,
        items: [
          "Fastest connection between Malta and Sicily — no combination of flights and transfers comes close door-to-door",
          "No airport. No security queues. No check-in two hours early.",
          "No luggage restrictions or fees",
          "Board at a city-centre port and arrive at a city-centre port",
          "Travel as a foot passenger or bring your car, motorbike, or van",
        ],
      },
      {
        title: "The Fleet",
        color: VIRTU_AMBER,
        items: [
          "High-speed catamaran hull — purpose-built for open Mediterranean sea crossings",
          "Operates at speeds that make the 90 km crossing achievable in under 2 hours",
          "Stabilised ride designed for passenger comfort even in moderate sea conditions",
          "Multiple passenger decks with indoor and outdoor seating",
          "Vehicle deck capacity for cars, motorbikes, campervans, and light commercial vehicles",
          "Modern fleet maintained to international maritime safety standards",
        ],
      },
      {
        title: "Onboard Experience",
        color: VIRTU_AMBER,
        items: [
          "Air-conditioned passenger saloons with comfortable seating",
          "Outdoor deck access — open-air views of the Mediterranean throughout the crossing",
          "Onboard café and bar — food and drinks available for purchase",
          "Satellite Wi-Fi powered by Starlink (paid: €4 for a 2-hour Internet & Streaming package; complimentary for Club Class passengers)",
          "TV screens throughout the passenger areas",
          "Dedicated seating areas including business-class style seats on some sailings",
          "Accessible facilities for passengers with reduced mobility",
          "Friendly, multilingual crew (Maltese, English, Italian)",
          "The crossing itself is part of the experience — golden hour on deck, Malta fading behind you, Sicily appearing ahead",
        ],
      },
      {
        title: "Value Positioning",
        color: VIRTU_BLUE,
        items: [
          "Not a budget option — an intelligent one",
          "When you factor in airport transfers, parking, baggage fees, and 2+ hours of queuing, the ferry wins on total cost",
          "Adult return from €63.60 (One Day offer)",
          "Light car return from €109.00",
          "No hidden fees — what you see is what you pay",
          "Children's fares available",
        ],
      },
      {
        title: "The Two Audiences",
        color: VIRTU_RED,
        items: [
          "English market: Maltese travellers using VF to reach Sicily for day trips, weekends, and holidays — they already know the route, speak to the feeling",
          "Italian market: Sicilians and mainland Italians for whom Malta is an aspirational short break — European, English-speaking, compact, and different",
          "International travellers using VF as a Mediterranean island-hop between two distinct cultures",
        ],
      },
      {
        title: "What Makes the Brand Different",
        color: VIRTU_BLUE,
        items: [
          "Decades of operating this exact route — institutional knowledge no competitor can replicate",
          "A brand that talks like a well-travelled friend, not a ticket seller",
          "Sicily and Malta content that goes beyond what every travel brand already says",
          "The crossing is presented as an experience, not a means to an end",
          "Tone: confident, editorially sharp, never corporate, never gushing",
        ],
      },
      {
        title: "Ferry vs Flying — The Honest Case",
        color: VIRTU_RED,
        items: [
          "Door-to-door: ~2h 30m by ferry vs 4h+ when you count airport time honestly",
          "Luggage: no restrictions by ferry vs fees, size limits, and weight caps by air",
          "Stress: board and sit by ferry vs arrive 2 hours early, queue, security, gate changes by air",
          "Car travel: possible by ferry, impossible by air without a rental desk",
          "Arrival point: city-centre port by ferry vs remote airport by air",
          "The view: open Mediterranean deck by ferry vs seat 32B by air",
        ],
      },
    ],
  },
  offers: {
    headerSubtitle:
      "Live pricing and offer details for use in content planning and copy generation. Updated monthly — always verify rates before publishing.",
    offers: [
      {
        id: "one-day",
        name: "One Day Offer",
        badge: "Day trip",
        badgeColor: VIRTU_BLUE,
        description: "Return the same day. The fastest way to do Malta or Sicily in a single trip.",
        validity: "Check current dates",
        hook: "There and back in a day.",
        prices: [
          { label: "Adult return", value: "€63.60", iconName: "Users" },
          { label: "Child return", value: "€44.60", iconName: "Users" },
          { label: "Light car", value: "€109.00", iconName: "Car" },
          { label: "Motorbike", value: "€69.00", iconName: "Bike" },
        ],
        notes: [],
      },
      {
        id: "more-than-one-day",
        name: "More Than One Day Offer",
        badge: "Extended stay",
        badgeColor: VIRTU_AMBER,
        description: "Stay longer. Same competitive rate as the day offer, extended for multi-day trips.",
        validity: "Extended until May 30, 2026",
        hook: "Stay as long as you like — the rate stays the same.",
        prices: [
          { label: "Adult return", value: "€63.60", iconName: "Users" },
          { label: "Light car", value: "€109.00", iconName: "Car" },
        ],
        notes: ["Extended until May 30, 2026"],
      },
      {
        id: "commercial-up-to-5-9m",
        name: "Commercial Vehicles up to 5.9m",
        badge: "Freight",
        badgeColor: VIRTU_BLUE,
        description:
          "All-in round-trip rates for commercial vehicles by length, with the driver's ticket included. Tiered by vehicle length up to 5.9 metres.",
        validity: "Current advertised rate — verify before publishing",
        hook: "Move freight across the channel for one all-in price — driver included.",
        prices: [
          { label: "Up to 4.5m round trip", value: "€413 + €67.60 ETS", iconName: "Truck" },
          { label: "Up to 5.0m round trip", value: "€520 + €74.60 ETS", iconName: "Truck" },
          { label: "Up to 5.5m round trip", value: "€581 + €81.60 ETS", iconName: "Truck" },
          { label: "Up to 5.9m round trip", value: "€676 + €88.60 ETS", iconName: "Truck" },
        ],
        notes: [
          "Rates include all expenses, including the vehicle driver's ticket",
          "Second driver travels FREE (pays charges only)",
          "Not applicable on refrigerated/fresh products, livestock, or live plants",
        ],
      },
      {
        id: "saturday-night",
        name: "Saturday Night in Malta",
        badge: "SNF Offer",
        badgeColor: VIRTU_RED,
        description: "Out Saturday night, home by Sunday morning. A weekend in Malta that doesn't cost you a full weekend.",
        validity: "Ongoing — extended indefinitely",
        hook: "Out Saturday night, home Sunday morning.",
        prices: [
          { label: "Per person return", value: "€57.00", iconName: "Users" },
        ],
        schedule: [
          { label: "Departs Sicily", value: "20:30 Saturday (Pozzallo)" },
          { label: "Returns to Sicily", value: "06:30 Sunday (Pozzallo)" },
          { label: "Route", value: "Malta (Marsa) ↔ Sicily (Pozzallo)" },
          { label: "Running", value: "Ongoing — no end date" },
        ],
        notes: [
          "Outbound Saturday night, inbound early Sunday morning",
          "Offer extended indefinitely (April 2026 update) — treat as a permanent weekend product, not a seasonal promo",
        ],
      },
    ],
    notes: [
      {
        title: "Price accuracy",
        body: "These are current advertised rates. Always link to virtuferries.com for booking — never guarantee availability or imply a price is locked without checking.",
        color: VIRTU_BLUE,
      },
      {
        title: "How to write offer copy",
        body: "Lead with the human hook, not the price. '€63.60' is not a headline. 'A day in Sicily for the price of dinner' is. Build to the number, don't open with it.",
        color: VIRTU_AMBER,
      },
      {
        title: "Saturday Night offer angle",
        body: "The SNF offer's real value is time arbitrage — you're asleep for the crossing, both ways. That's the story. 'Out Saturday night, home Sunday morning' is already the line.",
        color: VIRTU_RED,
      },
      {
        title: "Update reminder",
        body: "Offers change monthly. This page should be reviewed and updated at the start of each month before any promotional content is generated.",
        color: VIRTU_BLUE,
      },
    ],
  },
  excursions: {
    headerKicker: "Sicily, beyond the crossing",
    headerTitle: "Sicily Excursions",
    headerSubtitle:
      "What Virtu Ferries passengers can see and do in Sicily once they arrive. Source of truth for Sicily-flavour content, destination tips, and excursion prompts written for the Maltese market.",
    intro:
      "Sicily is a country of diversity — you cannot do it justice in a short spell of time. The island has a population of around 5 million and only became part of the Italian state in 1860. Look out for the ever-changing landscape (a feature even on a short trip), the volcano Etna, the characteristic hill-top towns rebuilt after the devastating earthquake of 1693, and the affluence of picturesque Taormina. If your stay is for a few days, do not forget that Sicily was once Magna Graecia.",
    highlightGroups: [
      {
        title: "Landscape & nature",
        iconName: "Mountain",
        accent: VIRTU_AMBER,
        items: [
          "Mt. Etna — the active volcano you can actually visit",
          "Hill-top towns rebuilt after the 1693 earthquake — characteristic Sicilian skyline",
          "Picturesque Taormina — postcard Sicily",
          "Iblei Mountain Range — rivers, valleys, canyons and lakes; rich flora and fauna; arguably the most picturesque area of Sicily",
        ],
      },
      {
        title: "Food & drink to take home",
        iconName: "Utensils",
        accent: VIRTU_RED,
        items: [
          "Torroncini — Sicilian nougat",
          "Pasta di Mandorla — almond cakes",
          "Limoncello — lemon liqueur, served well chilled",
          "Vino alla Mandorla — almond wine, also served chilled",
          "Averna — a Sicilian amaro (bitter liqueur)",
        ],
      },
      {
        title: "Heritage & UNESCO sites",
        iconName: "Landmark",
        accent: VIRTU_BLUE,
        items: [
          "Greek Temples of Agrigento — Magna Graecia heritage",
          "Roman Mosaics at Piazza Armerina",
          "Siracusa — Greek and Roman Theatres, plus the Cathedral (a former Temple of Athena) in ancient Ortygia",
          "Baroque cities of Noto, Ragusa and Modica — minutes from Pozzallo (Virtu's Sicily port)",
          "Palermo (the capital), Erice and Cefalu — within easy reach",
          "Many towns in the Provincia di Ragusa are UNESCO Heritage Sites",
        ],
      },
    ],
    excursions: [
      {
        id: "etna-catania-winter",
        name: "Mt. Etna & Catania",
        season: "Winter",
        destinations: ["Mt. Etna", "Catania"],
        description:
          "Volcano + city day. The largest active volcano in Europe paired with the baroque heart of Catania — Piazza del Duomo, Via Etnea, the Elephant Fountain, the fish market.",
        seasonDates: "October 2025 – April 2026",
        minParticipants: 10,
        schedules: [
          {
            label: "Thursday (October 2025 – April 2026)",
            depMalta: "06:30",
            arrPozzallo: "08:15",
            depPozzallo: "21:30",
            arrMalta: "23:15",
          },
          {
            label: "Sunday (1 October 2025 – 4 January 2026)",
            depMalta: "06:30",
            arrPozzallo: "08:15",
            depPozzallo: "20:30",
            arrMalta: "22:15",
          },
          {
            label: "Sunday (April 2026)",
            depMalta: "06:30",
            arrPozzallo: "08:15",
            depPozzallo: "20:30",
            arrMalta: "22:15",
          },
        ],
        pricing: {
          adultEur: 157.6,
          childEur: 101.6,
          ageRange: "4 to under 14",
          underFreeAge: 4,
          etsNote:
            "Headline price is inclusive of EU ETS surcharge. Underlying fares: Adults €153 + €4.60 ETS · Children €97 + €4.60 ETS.",
        },
        itinerary: [
          "Arrival at Pozzallo — a typical Sicilian fishing village",
          "Met by fully air-conditioned coaches, accompanied by guides",
          "On the way to Mt. Etna: stop to sample typical Sicilian delicacies — wines, almond sweets and honey (for sale, no obligation to buy)",
          "Drive up to the Sylvestri Craters of Mt. Etna — time for lunch (not included) and souvenir shopping",
          "Catania — guided walking tour through the baroque city centre, then free time around Piazza del Duomo, Via Etnea, the fish market, the Roman Amphitheatre and Villa Bellini",
          "Departure for Pozzallo with a running commentary by the guide",
          "Depart for Malta by High-Speed Catamaran",
        ],
        localTransport:
          "Local transport in Malta (Hotel/Harbour/Hotel) — €15 per person extra (VAT included). List of pick-up points and timings on virtuferries.com.",
        operationalNotes: [
          "Children under 4 years travel FREE of charge — pay local transport only (if applicable)",
          "The Company reserves the right to introduce a fuel surcharge from time to time without prior notice",
          "Itinerary may be altered subject to weather conditions",
          "Virtu Ferries Conditions of Carriage apply",
        ],
      },
      {
        id: "ragusa-modica-scicli",
        name: "Ragusa Ibla, Modica & Scicli",
        season: "Winter",
        destinations: ["Ragusa Ibla", "Modica", "Scicli"],
        description:
          "Three baroque jewels of the Val di Noto — UNESCO heritage trail just minutes from Pozzallo. Ragusa Ibla and Gagliardi's Duomo · Modica, the Città delle Cento Chiese, famed for Cioccolato di Modica · Scicli with its Saracen-decorated Palazzo Beneventano.",
        seasonDates: "October 2025 – April 2026",
        minParticipants: 10,
        schedules: [
          {
            label: "Sunday (5 January – 31 March 2026)",
            depMalta: "06:30",
            arrPozzallo: "08:15",
            depPozzallo: "19:30",
            arrMalta: "21:15",
          },
          {
            label: "Wednesday (11 March – 29 April 2026)",
            depMalta: "07:30",
            arrPozzallo: "09:15",
            depPozzallo: "19:30",
            arrMalta: "21:15",
          },
        ],
        pricing: {
          adultEur: 137.6,
          childEur: 97.6,
          ageRange: "4 to under 14",
          underFreeAge: 4,
          etsNote:
            "Headline price is inclusive of EU ETS surcharge. Underlying fares: Adults €133 + €4.60 ETS · Children €93 + €4.60 ETS.",
        },
        itinerary: [
          "Arrival at Pozzallo — a typical Sicilian fishing village, gradually turning into a tourist seaside resort",
          "Departure for Ragusa Ibla with running English commentary by the guide — coffee or Campari at the foot of the Duomo (a Gagliardi masterpiece)",
          "Departure for Modica — built on two levels, with quaint houses perched on the hillside; Modica Bassa, the old city centre, with Gagliardi's Duomo di San Giorgio towering above it",
          "Departure for Scicli with running English commentary by the guide",
          "Departure by High-Speed Catamaran for Malta",
        ],
        localTransport:
          "Local transport in Malta (Hotel/Harbour/Hotel) — €15 per person extra (VAT included). List of pick-up points and timings on virtuferries.com.",
        operationalNotes: [
          "Children under 4 years travel FREE of charge — pay local transport only (if applicable)",
          "The Company reserves the right to introduce a fuel surcharge from time to time without prior notice",
          "Itinerary may be altered subject to weather conditions",
          "Virtu Ferries Conditions of Carriage apply",
        ],
      },
      {
        id: "taormina-etna-summer",
        name: "Taormina & Mt. Etna",
        season: "Summer",
        destinations: ["Taormina", "Mt. Etna"],
        description:
          "Picturesque Taormina (206m above sea level, discovered by the British aristocracy in the mid-1800s, with its Greek Theatre still hosting summer classical plays) paired with the Sylvestri Crater of Mt. Etna at 2,000m.",
        seasonDates: "7 May – 27 September 2026",
        minParticipants: 15,
        schedules: [
          {
            label: "Thursday (7 May – 21 June 2026)",
            depMalta: "06:30",
            arrPozzallo: "08:15",
            depPozzallo: "21:30",
            arrMalta: "23:15",
          },
          {
            label: "Sunday (3 May – 27 September 2026)",
            depMalta: "06:30",
            arrPozzallo: "08:15",
            depPozzallo: "21:30",
            arrMalta: "23:15",
          },
        ],
        pricing: {
          adultEur: 159,
          childEur: 110,
          ageRange: "4 to under 14",
          underFreeAge: 4,
          etsNote: "Headline price is inclusive of EU ETS surcharge.",
        },
        itinerary: [
          "Arrival at Pozzallo — a typical Sicilian fishing village, gradually regaining its role as the main port of the province of Ragusa",
          "Departure in air-conditioned coaches, accompanied by English-speaking guides",
          "On the way to Taormina: pass by Siracusa (the home town of Archimedes) and the University City of Catania",
          "Taormina — free time to enjoy the unique panoramic view overlooking Giardini Naxos, a former Greek colony, now an international yachting centre. Time for lunch (not included)",
          "On the way to Mt. Etna: stop to sample typical Sicilian delicacies — wines, almond sweets and honey (for sale, no obligation to buy)",
          "Mt. Etna — from the Sylvestri Crater at 2,000m, panoramic view over the vast base of Etna and the effects of the most recent eruptions. Time for souvenir shopping",
          "Depart for Malta by High-Speed Catamaran at 21:30",
        ],
        localTransport:
          "Local transport in Malta (Hotel/Harbour/Hotel) — €15 per person extra (VAT included). List of pick-up points and timings on virtuferries.com.",
        operationalNotes: [
          "Children under 4 years travel FREE of charge — pay local transport only (if applicable)",
          "The Company reserves the right to introduce a fuel surcharge from time to time without prior notice",
          "Itinerary may be altered subject to weather conditions",
          "Virtu Ferries Conditions of Carriage apply",
        ],
      },
      {
        id: "catania-etna-summer",
        name: "Catania & Mt. Etna",
        season: "Summer",
        destinations: ["Catania", "Mt. Etna"],
        description:
          "Catania's lava-stone streets, baroque architecture, Piazza del Duomo, Via Etnea, the famous fish market, the Roman Amphitheatre and Villa Bellini — paired with a summer ascent to the Sylvestri Crater of Mt. Etna at 2,000m.",
        seasonDates: "25 June – 24 September 2026",
        minParticipants: 15,
        schedules: [
          {
            label: "Every Thursday (25 June – 24 September 2026)",
            depMalta: "07:30",
            arrPozzallo: "09:15",
            depPozzallo: "21:30",
            arrMalta: "23:15",
          },
        ],
        pricing: {
          adultEur: 159,
          childEur: 110,
          ageRange: "4 to under 14",
          underFreeAge: 4,
          etsNote: "Headline price is inclusive of EU ETS surcharge.",
        },
        itinerary: [
          "Arrival at Pozzallo — a typical Sicilian fishing village",
          "Departure in air-conditioned coaches, accompanied by English-speaking guides",
          "Catania — guided walking tour through the baroque city centre, then free time around Piazza del Duomo, Via Etnea, the fish market, the Roman Amphitheatre and Villa Bellini. Time for lunch (not included)",
          "On the way to Mt. Etna: stop to sample typical Sicilian delicacies — wines, almond sweets and honey (for sale, no obligation to buy)",
          "Mt. Etna — from the Sylvestri Crater at 2,000m, panoramic view over the vast base of Etna and the effects of the most recent eruptions. Time for souvenir shopping",
          "Depart for Malta by High-Speed Catamaran at 21:30",
        ],
        localTransport:
          "Local transport in Malta (Hotel/Harbour/Hotel) — €15 per person extra (VAT included). List of pick-up points and timings on virtuferries.com.",
        operationalNotes: [
          "Children under 4 years travel FREE of charge — pay local transport only (if applicable)",
          "The Company reserves the right to introduce a fuel surcharge from time to time without prior notice",
          "Itinerary may be altered subject to weather conditions",
          "Virtu Ferries Conditions of Carriage apply",
        ],
      },
      {
        id: "syracuse-marzamemi-summer",
        name: "Syracuse & Marzamemi",
        season: "Summer",
        destinations: ["Syracuse (Ortygia)", "Marzamemi"],
        description:
          "Ancient Ortygia with its Greek and Roman theatres and the Cathedral built into the former Temple of Athena, then the fishing village of Marzamemi for sea, salt and seafood. Schedule, pricing and itinerary not yet captured — verify the live site before promising specifics.",
      },
      {
        id: "malta-day-inbound",
        name: "Malta Excursion (inbound)",
        season: "Year-round",
        destinations: ["Malta (Valletta)"],
        description:
          "Inbound one-day excursion for Sicilian and Italian visitors travelling FROM Pozzallo TO Malta. Sell Malta as a compact, English-speaking, history-soaked Mediterranean island — small enough that you can do more than one thing in a day. Ended a long colonial chapter at Independence in 1964; EU member since 2004. The first Maltese came from Sicily before 5000 BC. Megalithic temples that predate the Pyramids and Stonehenge — several are UNESCO World Heritage Sites, as is Valletta. The Maltese language is the only Semitic language using the Latin alphabet. Long shared history with Sicily and Southern Italy in the Kingdom of the Two Sicilies until 1530, when the Knights of St John of Jerusalem (the Knights of Malta) arrived. Schedule, pricing and itinerary not yet captured — verify the live site before promising specifics.",
      },
    ],
    closingNote:
      "There is only one thing we are certain of — you will enjoy Sicily.",
    sourceUrl: "https://www.virtuferries.com",
    sourceLabel: "virtuferries.com — Sicily Excursions section",
  },
  customerPromise: {
    headerKicker: "The Virtu Ferries promise",
    headerTitle: "No-penalties, no-hidden-fees promise",
    headerSubtitle:
      "How Virtu Ferries treats passengers around refunds, changes and fees. This is the source of truth for any 'fairness', 'flexibility' or 'no hidden fees' copy. Use the exact wording — these are the brand's stated promises, not marketing puffery.",
    intro:
      "Have you paid for your passenger tickets and changed your mind? Not a problem — advise us at least 24 hours prior to departure and you will receive a full refund.",
    groups: [
      {
        id: "refunds",
        title: "Refunds & cancellations",
        iconName: "RefreshCw",
        accent: VIRTU_BLUE,
        items: [
          "Full refund on a paid passenger ticket if you advise us at least 24 hours prior to departure.",
          "No no-show penalty on passenger tickets.",
        ],
      },
      {
        id: "changes",
        title: "Free changes",
        iconName: "BadgeCheck",
        accent: VIRTU_AMBER,
        items: [
          "No penalties for name change on passenger tickets.",
          "No penalties for name change on driver & vehicle tickets.",
          "No charges to change the travel date on either the outgoing or return leg, within the same fare basis (subject to space).",
        ],
      },
      {
        id: "vehicles",
        title: "Vehicle treatment",
        iconName: "Car",
        accent: VIRTU_RED,
        items: [
          "Commercially registered Land Rovers, pick-ups and panel vans up to 4.5m in length pay light vehicle tariffs (when used for non-commercial purposes).",
          "Heavily discounted rates for commercial vehicles up to 5.9 metres.",
          "Passenger mini-vans pay light vehicle tariffs.",
        ],
      },
      {
        id: "fees",
        title: "No hidden fees",
        iconName: "Wallet",
        accent: VIRTU_BLUE,
        items: [
          "No personal baggage over-weight charges.",
          "No administration charges on bookings.",
          "No credit card payment fees.",
          "No additional charges for new tickets purchased during check-in.",
        ],
      },
    ],
    caveat: "Not applicable on special offers.",
    sourceUrl: "https://www.virtuferries.com",
    sourceLabel: "virtuferries.com — published customer promise / fee statement",
  },
  resources: {
    guidelinesPdf: {
      name: "Virtu Ferries Brand Guidelines",
      description:
        "Complete reference — voice, tone, key messages, logo usage, colour palette, typography, and social media standards.",
      path: "/virtu-ferries-brand-guidelines.pdf",
      filename: "virtu-ferries-brand-guidelines.pdf",
    },
    cheatSheetEnabled: true,
    vault: [
      { name: "Logo Pack (SVG, PNG, EPS)", type: "folder", size: "12 MB", iconName: "Folder" },
      { name: "Social Media Templates (Figma)", type: "folder", size: "45 MB", iconName: "Folder" },
      { name: "B-Roll Footage Library", type: "video", size: "2.1 GB", iconName: "Video" },
      { name: "Campaign Imagery 2024", type: "image", size: "850 MB", iconName: "Image" },
    ],
    vaultUnderConstruction: true,
  },
  sicilyTowns: {
    headerKicker: "Sicily reach from Pozzallo",
    headerTitle: "Towns under 4 hours from Pozzallo",
    headerSubtitle:
      "Drive-time atlas — every town below is reachable within four hours of stepping off the catamaran. Use it as the source of truth when writing destination content, recommending day trips, or briefing the team on how far Sicily really opens up once you cross.",
    intro:
      "Times are approximate one-way driving estimates from the Pozzallo terminal in fair conditions. Coastal and motorway routes (A18, A19, A29) are the typical paths.",
    groups: [
      {
        bracket: "Under 1 hour",
        intro: "The immediate hinterland — the south-eastern baroque belt, easy half-day or evening trips.",
        towns: [
          { name: "Noto", description: "Baroque architecture, UNESCO World Heritage." },
          { name: "Modica", description: "Famous for its ancient chocolate." },
          { name: "Ragusa Ibla", description: "Hilltop baroque town." },
          { name: "Marzamemi", description: "Charming fishing village." },
          { name: "Avola", description: "Almond capital of Sicily." },
          { name: "Ispica", description: "Cave dwellings and baroque centre." },
          { name: "Scicli", description: "Lesser known baroque gem." },
        ],
      },
      {
        bracket: "1 to 2 hours",
        intro: "The east coast and central highlands — Etna, ancient Greece, Roman mosaics.",
        towns: [
          { name: "Siracusa / Ortigia", description: "Ancient Greek city, island old town." },
          { name: "Catania", description: "Vibrant city, Mount Etna gateway." },
          { name: "Piazza Armerina", description: "Roman mosaics at Villa Romana del Casale." },
          { name: "Enna", description: "Hilltop city, centre of the island." },
          { name: "Caltagirone", description: "Famous for its ceramic staircases." },
          { name: "Agrigento", description: "Valley of the Temples." },
          { name: "Porto Empedocle", description: "Coastal town, Agrigento gateway." },
        ],
      },
      {
        bracket: "2 to 3 hours",
        intro: "Cross-island reach — north coast, Palermo, the wine country.",
        towns: [
          { name: "Taormina", description: "Clifftop town, Greek Theatre, Isola Bella." },
          { name: "Cefalù", description: "Beach town, Norman cathedral." },
          { name: "Palermo", description: "Capital city, street food, markets." },
          { name: "Marsala", description: "Wine country, salt flats." },
          { name: "Trapani", description: "Western coast, salt pans, ferry to Egadi Islands." },
          { name: "Selinunte", description: "Ancient Greek ruins on the coast." },
        ],
      },
      {
        bracket: "3 to 4 hours",
        intro: "The far west and far north — full-day or overnight territory.",
        towns: [
          { name: "Segesta", description: "Ancient Greek temple and theatre." },
          { name: "Erice", description: "Medieval hilltop town above Trapani." },
          { name: "Castellammare del Golfo", description: "Stunning coastal town." },
          { name: "Scopello", description: "Tiny village, famous tonnara and faraglioni." },
          { name: "San Vito Lo Capo", description: "White sand beach, couscous festival." },
          { name: "Messina", description: "North-eastern tip, gateway to mainland Italy." },
        ],
      },
    ],
    footer:
      "Use the brackets when framing trip ideas — 'Under 1 hour' is the easy-yes day trip, '3 to 4 hours' is full-day or overnight content.",
  },
  monthlyPlanning: {
    pillarsEnglish: [
      { num: "01", title: "Choose Virtu", desc: "Make Virtu Ferries the preferred travel option. Speed, comfort, convenience, car flexibility, pet travel, no airport friction." },
      { num: "02", title: "Choose Sicily", desc: "Create destination demand for Maltese travellers. Beaches, food, culture, nature, towns, events, seasonal travel moments in Sicily." },
      { num: "03", title: "Virtu Recommends", desc: "Help people plan the trip. Curated Sicily travel content — restaurants, towns, trails, day plans, itineraries, practical recommendations." },
      { num: "04", title: "The Crossing", desc: "Make the journey part of the story. Onboard experience, crew, passenger UGC, deck views, arrivals, departures." },
      { num: "05", title: "The Community", desc: "Keep the audience involved. Trends, polls, reposts, UGC, comments-led posts, reactive social moments." },
      { num: "06", title: "Flexible / Operational", desc: "Schedules, ops and service info only. Includes the weekly Saturday schedule and disruption notices." },
    ],
    pillarsItalian: [
      { num: "01", title: "Choose Virtu", desc: "Rendi Virtu Ferries la scelta preferita. Velocità, comfort, comodità, flessibilità auto, viaggi con animali, niente attriti aeroportuali." },
      { num: "02", title: "Choose Malta", desc: "Crea desiderio per Malta — Valletta, Gozo, spiagge, storia, eventi. La scoperta che non sapevano di volere." },
      { num: "03", title: "Virtu Recommends", desc: "Aiuta a pianificare il viaggio. Consigli curati per Malta — ristoranti, città, itinerari, idee stagionali, suggerimenti pratici." },
      { num: "04", title: "The Crossing", desc: "Il viaggio è parte della storia. Esperienza a bordo, equipaggio, UGC dei passeggeri, viste dal ponte, arrivi e partenze." },
      { num: "05", title: "The Community", desc: "Tieni il pubblico coinvolto. Trend, sondaggi, repost, UGC, contenuti reattivi guidati dai commenti." },
      { num: "06", title: "Flexible / Operational", desc: "Solo orari, comunicazioni operative e info di servizio. Include la schedule settimanale del sabato." },
    ],
    offersSnapshot: [
      { name: "One Day Offer", detail: "Adult return €63.60 · Child €44.60 · Light car €109 · Motorbike €69" },
      { name: "More Than One Day", detail: "Adult return €63.60 · Light car €109 · Extended to May 30, 2026" },
      { name: "Saturday Night Malta", detail: "€57/person return · 20:30 Sat dep. Pozzallo · 06:30 Sun return · Jan–Apr 2026" },
      { name: "Commercial Vehicles up to 5.9m", detail: "Round trip incl. driver: 4.5m €413+€67.60 ETS · 5.0m €520+€74.60 · 5.5m €581+€81.60 · 5.9m €676+€88.60 · 2nd driver FREE (charges only)" },
    ],
    markets: [
      { label: "Maltese market", channels: "Facebook · 25 posts/month + Instagram · 25 posts/month" },
      { label: "Italian market", channels: "Facebook · 25 posts/month · Facebook only" },
    ],
    englishMarketLabel: "Maltese market",
    italianMarketLabel: "Italian market",
    englishAudienceLine: "Selling Sicily to Maltese & international travellers.",
    italianAudienceLine: "Selling Malta to Sicilians & Italian travellers.",
  },
  socialMediaExpert: {
    platforms: [
      { value: "english-facebook", label: "English — Facebook (Virtu Ferries)" },
      { value: "italian-facebook", label: "Italian — Facebook (Le Vacanze Maltesi)" },
      { value: "italian-instagram", label: "Italian — Instagram (@virtuferrieslimited)" },
    ],
  },
  contentIdeas: {
    themes: ["The Crossing", "Malta", "Sicily", "Travel Tips", "People & Stories"],
  },
  copywriter: {
    promptPlaceholderEn: "Describe the post — e.g. «summer offer for couples, Sicily at sunset, warm and inviting tone»",
    promptPlaceholderIt: "Descrivi il post — ad es. «promozione biglietti estivi, focus su Valletta al tramonto»",
  },
};

// ─── Gozo Highspeed scaffold ───────────────────────────────────────────────
//
// Empty-by-design. Pages render "Not configured yet" cards for any list that's
// empty. Fill these arrays in over time as the team writes Gozo content.

// Official Gozo Highspeed brand palette (per the 2024 Brandbook, p.11):
// only TWO brand colours — deep blue + signal red. GOZO_AMBER is kept as a
// neutral UI accent for seasonal-route differentiation in timetables, but it
// is not part of the official palette and never appears in the assets page.
const GOZO_BLUE = "#1d3289";
const GOZO_RED = "#ea2d3f";
const GOZO_AMBER = "#fbbf24";

const GOZO_HIGHSPEED: BrandContent = {
  hubLabel: "Brand Hub",
  brandShortLabel: "Gozo Highspeed",
  brandDisplayName: "Gozo Highspeed",
  history: {
    hero: {
      kicker: "Brand history",
      title: "Gozo Highspeed",
      subtitle:
        "Brand history not configured yet. Add the founding story, milestones, fleet, and heritage details so the AI agent and the team have a single source of truth.",
    },
    stats: [],
    timeline: [],
    vessels: [],
    heritage: [],
  },
  identity: {
    headerSubtitle:
      "Gozo Highspeed — the fast, reliable, high-frequency ferry between Malta and Gozo. Born from a collaboration between Virtu Ferries Gozo and Gozo Fast, built around speed, reliability, and customer convenience.",
    brandStory:
      "Gozo Highspeed was born from a shared vision to provide a reliable and efficient fast ferry service connecting the Maltese islands. A result of a collaboration between Virtu Ferries Gozo and Gozo Fast, Gozo Highspeed delivers the quickest and most reliable ferry service for commuters and tourists alike.\n\nAt Gozo Highspeed, we understand that our customers value their time and want to travel efficiently between Malta and Gozo. That's why we offer the most convenient ferry schedules with multiple daily departures, allowing passengers to easily plan their journey. Our fast and reliable services ensure reduced waiting times and a stress-free journey, while our modern facilities provide the comfort and convenience travellers deserve.\n\nWith years of experience in the ferry industry, our team of experts is dedicated to delivering top-notch service that meets and exceeds expectations. We pride ourselves on making sure that your journey with us is a smooth and enjoyable one, whether you're commuting to work or exploring the beautiful Maltese islands.\n\nArrive faster and travel smarter with Gozo Highspeed — the ferry service that puts your comfort and convenience first.",
    toneOfVoice: [
      "Clear — communicate information in a concise and straightforward manner, avoiding unnecessary complexity, jargon, or flowery filler.",
      "Professional — maintain a polished and knowledgeable tone that instils confidence in our services and expertise.",
      "Engaging — connect with the audience on a personal level, using a friendly and approachable tone that fosters a positive relationship.",
      "Energetic — convey a sense of excitement and enthusiasm, highlighting the benefits and unique experiences of travelling with Gozo Highspeed.",
    ],
    keyMessages: [
      "**Mantra:** \"Arrive faster and travel smarter with Gozo Highspeed.\"",
      "**Positioning:** Known for our impressive speed, unwavering reliability, and unmatched convenience. Gozo Highspeed provides an exceptional travel experience for commuters and tourists, seamlessly connecting the lively islands of Malta and Gozo with swift and hassle-free journeys every time.",
      "**Personality — Reliable:** We strive to deliver a consistent and trustworthy ferry service, ensuring that our customers can depend on us for their transportation needs.",
      "**Personality — Efficient:** We understand the value of our customers' time and are committed to providing a fast and streamlined travel experience.",
      "**Personality — Customer-Centric:** Our customers are at the heart of everything we do. We aim to anticipate their needs and exceed their expectations, delivering exceptional service and support.",
      "**Personality — Friendly:** We foster a warm and welcoming atmosphere, making our customers feel comfortable and valued throughout their journey.",
      "**Operator lockup:** Operated By Virtu Ferries Gozo · Gozo Fast Ferry — always credit both partners when using the full logo with tagline.",
      "**Hero claims used in brand mockups:** \"Malta to Gozo in 45 Minutes\" · \"Valletta → Gozo in Only 45 Minutes\" · ferry-schedule poster format with outbound + inbound times side by side.",
      "Multiple daily departures across three Maltese ports (Valletta year-round; Sliema and Buġibba seasonally) — easy to plan, easy to board.",
      "Reduced waiting times, modern facilities, stress-free crossings designed around the passenger's schedule.",
    ],
    whatToSay: [
      "Lead with the practical benefit — crossing time, frequency, ease of getting to/from Gozo — before any flavour copy.",
      "Always sound like at least one of the four personality pillars (Reliable, Efficient, Customer-Centric, Friendly) and never contradict any of them.",
      "Match the four tone cues in every output: Clear, Professional, Engaging, Energetic.",
      "Reference real schedule facts: 45-minute Valletta crossing, year-round daily service, multiple sailings each way per day.",
      "Speak to both audiences side by side — daily commuters AND tourists exploring the islands.",
      "Use the mantra naturally where it fits: \"Arrive faster and travel smarter.\"",
      "When introducing the brand, credit the operator lockup: \"Operated By Virtu Ferries Gozo · Gozo Fast.\"",
    ],
    whatNotToSay: [
      "Avoid travel-brochure clichés: \"discover\", \"hidden gem\", \"breathtaking\", \"magical\", \"stunning\".",
      "Don't overpromise on weather, sea conditions, or guaranteed times that depend on operations.",
      "Don't reuse Virtu Ferries (Malta ↔ Sicily) copy or imply the two services share a vessel, ticket, or route.",
      "Don't bury the practical info under tone — frequency, route, and crossing time should always be visible.",
      "Don't drop the \"Operated By\" lockup credit when using the full logo with tagline (Virtu Ferries Gozo + Gozo Fast).",
      "Never recolour or swap any element of the speed-ferry mark — the blue + red palette is fixed.",
    ],
  },
  assets: {
    headerSubtitle:
      "Visual brand assets per the official Gozo Highspeed Brandbook (designed by 157 Media, 2024) — two-colour palette, Montserrat typography, three logo lockups (icon, wordmark, wordmark + Operated-By tagline), each available in full-colour, white-on-blue, and white-on-red. Always pair the logo with the \"Operated By Virtu Ferries Gozo · Gozo Fast\" credit when possible.",
    logos: [
      {
        label: "Speed-ferry icon — full colour",
        description: "Standalone mark. Blue hull (#1d3289) + red speed lines (#ea2d3f). Use as a small standalone token, e.g. avatar or favicon.",
        src: "",
        file: "",
        filename: "gozo-highspeed-icon-colour.svg",
        bg: "bg-white border border-gray-200",
      },
      {
        label: "Speed-ferry icon — white reversed",
        description: "All-white version of the icon for use on a brand-blue or brand-red background.",
        src: "",
        file: "",
        filename: "gozo-highspeed-icon-white.svg",
        bg: "bg-[#1d3289]",
      },
      {
        label: "Wordmark logo — full colour",
        description: "GOZO in brand blue + HIGHSPEED in brand red, paired with the speed-ferry icon. Primary mark for white/light backgrounds.",
        src: "",
        file: "",
        filename: "gozo-highspeed-logo-colour.svg",
        bg: "bg-white border border-gray-200",
      },
      {
        label: "Wordmark logo — white reversed",
        description: "All-white wordmark + icon for brand-blue or brand-red backgrounds, or for darker photographic imagery (apply a darkening filter to the photo first).",
        src: "",
        file: "",
        filename: "gozo-highspeed-logo-white.svg",
        bg: "bg-[#1d3289]",
      },
      {
        label: "Wordmark + Operated-By tagline — full colour",
        description: "Preferred lockup whenever space allows. Adds \"Operated By Virtu Ferries Gozo · Gozo Fast Ferry\" beneath the wordmark.",
        src: "",
        file: "",
        filename: "gozo-highspeed-logo-tagline-colour.svg",
        bg: "bg-white border border-gray-200",
      },
      {
        label: "Wordmark + Operated-By tagline — white reversed",
        description: "All-white tagline lockup for use on brand-blue or brand-red backgrounds.",
        src: "",
        file: "",
        filename: "gozo-highspeed-logo-tagline-white.svg",
        bg: "bg-[#ea2d3f]",
      },
    ],
    colours: [
      { name: "Brand Blue", hex: GOZO_BLUE, desc: "Primary brand colour. CMYK C100 M94 Y13 K2.", className: "bg-[#1d3289]" },
      { name: "Brand Red", hex: GOZO_RED, desc: "Signal accent — speed lines, highlights, CTA. CMYK C2 M96 Y77 K0.", className: "bg-[#ea2d3f]" },
    ],
    logoDos: [
      "When possible, always use the version with the \"Operated By Virtu Ferries Gozo · Gozo Fast\" tagline.",
      "Place the logo on a clean white, brand-blue, or brand-red background; switch to the all-white version on darker imagery.",
      "When using a photo background, use the white logo and apply a darkening filter to the image so the mark stays legible (per Brandbook p.13).",
      "Keep the speed-line icon and wordmark proportions exactly as supplied — they were drawn together.",
      "Use only the supplied logo files — do not recreate, retrace, or rebuild the mark.",
    ],
    logoDonts: [
      "Don't move or shrink elements from the logo.",
      "Don't change or swap the original colours of the logo (e.g. recolouring the hull green is forbidden).",
      "Don't warp the logo.",
      "Don't stretch the logo in any way.",
      "Don't add any effects like stroke or drop shadow to the logo.",
      "Don't add or remove elements from the logo.",
      "Don't place the logo on a busy or low-contrast background where the speed lines disappear.",
    ],
    typography: {
      primaryFontName: "Montserrat",
      weights: [
        {
          weight: "Black 900",
          sample: "Arrive faster.",
          className: "font-black text-gray-900 text-6xl leading-[0.9] tracking-tighter",
          usage: "Reserve for the single hero claim on a poster, OOH, or social cover. The brandbook mantra (\"Arrive faster and travel smarter\") is set in Black — never use for any other copy.",
        },
        {
          weight: "ExtraBold 800",
          sample: "Malta ↔ Gozo in 45 minutes.",
          className: "font-extrabold text-gray-900 text-4xl leading-[0.95] tracking-tighter",
          usage: "Page H1s, primary headlines, route claims (\"Valletta → Gozo in Only 45 Minutes\"). Use when the line must sit beneath the hero claim with equal authority.",
        },
        {
          weight: "SemiBold 600",
          sample: "Multiple daily departures from Valletta, Sliema and Buġibba.",
          className: "font-semibold text-gray-900 text-2xl leading-snug",
          usage: "Section headings, sub-claims, schedule labels, primary CTAs. Use to break up a page into scannable blocks without competing with the headline.",
        },
        {
          weight: "Regular 400",
          sample: "Comfortable, modern crossings designed around your schedule.",
          className: "font-normal text-gray-700 text-lg leading-relaxed",
          usage: "Body copy, captions, supporting paragraphs, form labels. Default reading weight — should be the most-used weight on every page.",
        },
      ],
    },
  },
  socialMedia: {
    headerSubtitle: "Markets, platforms, pillars, and tone registers. Not configured yet.",
    markets: [],
    pillars: [],
    registers: [],
  },
  travelInfo: {
    headerKicker: "Operational reference",
    headerTitle: "Travel Info",
    headerNote:
      "Authoritative passenger information for Gozo Highspeed. Routes, schedules and travel rules drawn from the official A5 brochure (April 2026 issue). Use this as the source of truth for service-led content, passenger answers, and AI agent responses.",
    contacts: null,
    sections: [
      {
        id: "routes",
        title: "Three ports, one Gozo",
        iconName: "Ship",
        accent: GOZO_BLUE,
        intro:
          "Gozo Highspeed connects three Maltese ports to Mġarr (Gozo). Valletta runs year-round and direct; the seasonal Sliema service calls at Bugibba en route to Gozo. Bugibba also operates as its own shorter crossing.",
        bullets: [
          "Valletta ↔ Gozo — direct, year-round, up to ~15 sailings each way per day",
          "Sliema → Bugibba → Gozo — seasonal: March to October, ~10 sailings each way per day (calls at Bugibba)",
          "Bugibba ↔ Gozo — direct, seasonal: March to October, ~10 sailings each way per day",
        ],
      },
      {
        id: "schedule-valletta",
        title: "Valletta ↔ Gozo",
        iconName: "Clock",
        accent: GOZO_BLUE,
        intro:
          "Year-round, daily. The two latest crossings (marked * and **) run on a seasonal schedule — see legend.",
        timetable: {
          badge: "Year-round",
          crossingMinutes: 45,
          outboundLabel: "Valletta → Gozo",
          outboundTimes: [
            "06:45", "08:45", "09:45", "10:45", "11:45", "12:45",
            "13:45", "14:45", "15:45", "16:45", "17:45", "18:45",
            "19:45", "20:45", "22:15*", "00:30**",
          ],
          inboundLabel: "Gozo → Valletta",
          inboundTimes: [
            "05:45", "06:45", "07:45", "09:45", "10:45", "11:45",
            "12:45", "13:45", "14:45", "15:45", "16:45", "17:45",
            "18:45", "19:45", "20:45", "22:15*", "23:30**",
          ],
          legend: [
            { marker: "*", meaning: "1 Oct – 30 Apr: Fri & Sat only · 1 May – 30 Sep: daily" },
            { marker: "**", meaning: "1 May – 30 Sep only, Fri & Sat. Not operated in winter." },
          ],
        },
      },
      {
        id: "schedule-sliema",
        title: "Sliema → Bugibba → Gozo",
        iconName: "Clock",
        accent: GOZO_AMBER,
        intro:
          "Seasonal — operates daily from March through October. The Sliema service is multi-stop: every crossing calls at Bugibba before continuing to Gozo (and the reverse on the way back). End-to-end ~75 min; Sliema ↔ Bugibba ~45 min; Bugibba ↔ Gozo ~30 min.",
        timetable: {
          badge: "Mar – Oct · via Bugibba",
          crossingMinutes: 75,
          outboundLabel: "Sliema → Bugibba → Gozo",
          outboundTimes: [
            "05:45", "06:45", "08:45", "09:45", "11:45",
            "13:45", "15:45", "16:45", "18:45", "19:45", "22:00",
          ],
          inboundLabel: "Gozo → Bugibba → Sliema",
          inboundTimes: [
            "05:15", "07:15", "08:15", "10:15", "11:15",
            "13:15", "15:15", "17:15", "18:15", "20:15", "21:15",
          ],
        },
      },
      {
        id: "schedule-bugibba",
        title: "Bugibba ↔ Gozo",
        iconName: "Clock",
        accent: GOZO_AMBER,
        intro:
          "Seasonal route from the north of Malta. Operates daily from March through October — and it's the shortest crossing of the three.",
        timetable: {
          badge: "Mar – Oct",
          crossingMinutes: 30,
          outboundLabel: "Bugibba → Gozo",
          outboundTimes: [
            "06:30", "07:30", "09:30", "10:30", "12:30",
            "14:30", "16:30", "17:30", "19:30", "20:30", "22:45",
          ],
          inboundLabel: "Gozo → Bugibba",
          inboundTimes: [
            "05:15", "07:15", "08:15", "10:15", "11:15",
            "13:15", "15:15", "17:15", "18:15", "20:15", "21:45",
          ],
        },
      },
      {
        id: "patient-travel",
        title: "Free travel for hospital patients",
        iconName: "Accessibility",
        accent: GOZO_RED,
        intro:
          "Patients travelling for a hospital appointment travel free of charge on the Sliema ↔ Bugibba ↔ Gozo route — including the return journey.",
        bullets: [
          "Applies to the Sliema ↔ Bugibba ↔ Gozo route only",
          "Both directions covered — outbound and return",
          "Present a valid hospital appointment confirmation at the booth",
        ],
      },
    ],
  },
  onboardExperience: {
    headerKicker: "Onboard amenities",
    headerTitle: "Onboard Experience",
    headerSubtitle:
      "Connectivity, premium tiers, comfort, and food & drink onboard. Not configured yet — add the amenities and they will surface here and in the AI agent's knowledge.",
    sections: [],
  },
  usp: {
    headerKicker: "Why Gozo Highspeed",
    headerSubtitle:
      "What makes the brand different — route, fleet, experience, value, audiences. Not configured yet.",
    sections: [],
  },
  offers: {
    headerSubtitle:
      "Standard one-way fares for every route, by passenger category. Drawn from the official A5 brochure (April 2026 issue). Always verify before publishing — fares change with the seasonal calendar.",
    offers: [
      {
        id: "fares-valletta",
        name: "Valletta ↔ Gozo — Fares",
        badge: "Year-round",
        badgeColor: GOZO_BLUE,
        description:
          "Standard one-way fares for the year-round Valletta route. Discounts apply on presentation of the relevant ID at the booth.",
        validity: "Current — verify before publishing",
        hook: "From €2.25 for Gozo Residents.",
        prices: [
          { label: "Adults & Youths — Standard", value: "€7.50", iconName: "Users" },
          { label: "Adults & Youths — Gozo Residents", value: "€2.25", iconName: "Users" },
          { label: "Adults & Youths — Students (University & MCAST)", value: "€4.50", iconName: "Users" },
          { label: "Senior Citizens", value: "€3.00", iconName: "Users" },
          { label: "Passengers with Special Needs", value: "€3.00", iconName: "Users" },
          { label: "Children (4 to 10 years)", value: "€3.00", iconName: "Users" },
          { label: "Infants (up to 3 years)", value: "FREE", iconName: "Users" },
        ],
        notes: [
          "Gozo Residents: Gozitan ID or residence permit accepted",
          "Students: University & MCAST students only",
          "Senior Citizens & Special Needs: ID / Blue or Yellow Card required",
        ],
      },
      {
        id: "fares-sliema",
        name: "Sliema ↔ Gozo — Fares",
        badge: "March–October",
        badgeColor: GOZO_AMBER,
        description:
          "Standard one-way fares for the seasonal Sliema route. Includes a discounted Tallinja Card option.",
        validity: "Current — verify before publishing",
        hook: "Tallinja Card holders pay €6.50.",
        prices: [
          { label: "Adults & Youths — Standard", value: "€8.50", iconName: "Users" },
          { label: "Adults & Youths — Gozo Residents", value: "€2.25", iconName: "Users" },
          { label: "Adults & Youths — Students (University & MCAST)", value: "€4.50", iconName: "Users" },
          { label: "Adults & Youths — Tallinja Card", value: "€6.50", iconName: "Users" },
          { label: "Senior Citizens", value: "€3.00", iconName: "Users" },
          { label: "Passengers with Special Needs", value: "€3.00", iconName: "Users" },
          { label: "Children (4 to 10 years) — Standard", value: "€4.00", iconName: "Users" },
          { label: "Children (4 to 10 years) — Tallinja Card holders", value: "€3.00", iconName: "Users" },
          { label: "Infants (up to 3 years)", value: "FREE", iconName: "Users" },
        ],
        notes: [
          "Tallinja Card discount applies on presentation of the card",
          "Gozo Residents: Gozitan ID or residence permit accepted",
        ],
      },
      {
        id: "fares-bugibba",
        name: "Bugibba ↔ Gozo — Fares",
        badge: "March–October",
        badgeColor: GOZO_AMBER,
        description:
          "Standard one-way fares for the seasonal Bugibba route — the shortest crossing and the cheapest Standard fare among the three routes.",
        validity: "Current — verify before publishing",
        hook: "30-minute crossing from the north of Malta.",
        prices: [
          { label: "Adults & Youths — Standard", value: "€6.50", iconName: "Users" },
          { label: "Adults & Youths — Gozo Residents", value: "€2.00", iconName: "Users" },
          { label: "Adults & Youths — Students (University & MCAST)", value: "€3.50", iconName: "Users" },
          { label: "Senior Citizens", value: "€3.00", iconName: "Users" },
          { label: "Passengers with Special Needs", value: "€3.00", iconName: "Users" },
          { label: "Children (4 to 10 years)", value: "€3.00", iconName: "Users" },
          { label: "Infants (up to 3 years)", value: "FREE", iconName: "Users" },
        ],
        notes: [
          "Lowest standard adult fare of the three routes",
          "Gozo Residents fare here is €2.00 (vs. €2.25 elsewhere)",
        ],
      },
      {
        id: "fares-sliema-bugibba",
        name: "Sliema ↔ Bugibba — Fares",
        badge: "Shuttle",
        badgeColor: GOZO_RED,
        description:
          "The Malta-internal shuttle leg between Sliema and Bugibba. FREE for Tallinja Card holders.",
        validity: "Current — verify before publishing",
        hook: "Free with a Tallinja Card.",
        prices: [
          { label: "Adults & Youths — Standard", value: "€6.50", iconName: "Users" },
          { label: "Adults & Youths — Students (University & MCAST)", value: "€3.00", iconName: "Users" },
          { label: "Tallinja Card Holders — Standard fare", value: "FREE", iconName: "Users" },
          { label: "Senior Citizens", value: "€3.00", iconName: "Users" },
          { label: "Passengers with Special Needs", value: "€3.00", iconName: "Users" },
          { label: "Children (4 to 10 years)", value: "€3.00", iconName: "Users" },
          { label: "Infants (up to 3 years)", value: "FREE", iconName: "Users" },
        ],
        notes: [
          "Tallinja Card holders ride this leg FREE",
          "Add the Gozo leg from either side at standard fares for a through journey",
        ],
      },
    ],
    notes: [
      {
        title: "Patient travel — both ways free",
        body: "Patients travelling to a hospital appointment travel free of charge on the Sliema ↔ Bugibba ↔ Gozo route, including the return journey, on presentation of a valid appointment confirmation.",
        color: GOZO_RED,
      },
      {
        title: "How to write fare copy",
        body: "Lead with the human angle, not the number. 'Gozitan? €2.25 a crossing.' is a headline. '€2.25 one-way fare for Gozo Residents (Valletta route)' is a footnote. Build to the price, don't open with it.",
        color: GOZO_BLUE,
      },
      {
        title: "Always state the route",
        body: "Fares vary by route. Never quote a single fare without naming the route — 'from €6.50 (Bugibba)' or 'from €7.50 (Valletta)'. Sliema is the most expensive standard fare; Bugibba the cheapest.",
        color: GOZO_AMBER,
      },
      {
        title: "Update reminder",
        body: "Fares are sourced from the April 2026 A5 brochure. Re-verify against the latest brochure or the website before any campaign goes live.",
        color: GOZO_BLUE,
      },
    ],
  },
  resources: {
    guidelinesPdf: null,
    cheatSheetEnabled: false,
    vault: [],
    vaultUnderConstruction: true,
  },
  monthlyPlanning: {
    pillarsEnglish: [],
    pillarsItalian: [],
    offersSnapshot: [],
    markets: [],
    englishMarketLabel: "English market",
    italianMarketLabel: "Italian market",
    englishAudienceLine: "Audience framing not configured yet.",
    italianAudienceLine: "Audience framing not configured yet.",
  },
  socialMediaExpert: {
    platforms: [],
  },
  contentIdeas: {
    themes: [],
  },
  copywriter: {
    promptPlaceholderEn: "Describe the post — e.g. tone, audience, the angle you want.",
    promptPlaceholderIt: "Descrivi il post — tono, pubblico, angolo desiderato.",
  },
};

// ─── Registry ──────────────────────────────────────────────────────────────

export const BRAND_CONTENT: Record<string, BrandContent> = {
  "virtu-ferries": VIRTU_FERRIES,
  "gozo-highspeed": GOZO_HIGHSPEED,
};

/**
 * Returns the knowledge slice for the given brand slug. Falls back to the
 * empty scaffold so callers never get cross-brand data leakage.
 */
export function getBrandContent(slug: string | null | undefined): BrandContent {
  if (!slug) return EMPTY_BRAND_CONTENT;
  return BRAND_CONTENT[slug] ?? EMPTY_BRAND_CONTENT;
}

// Returned when the active brand has no registry entry. Renders entirely as
// empty-state cards — no data leakage from another brand.
export const EMPTY_BRAND_CONTENT: BrandContent = {
  hubLabel: "Brand Hub",
  brandShortLabel: "",
  brandDisplayName: "",
  history: {
    hero: { kicker: "Brand history", title: "Brand history", subtitle: "Brand history not configured yet." },
    stats: [], timeline: [], vessels: [], heritage: [],
  },
  identity: {
    headerSubtitle: "Brand identity not configured yet.",
    brandStory: "",
    toneOfVoice: [], keyMessages: [], whatToSay: [], whatNotToSay: [],
  },
  assets: {
    headerSubtitle: "Brand assets not configured yet.",
    logos: [], colours: [], logoDos: [], logoDonts: [],
  },
  socialMedia: {
    headerSubtitle: "Social media reference not configured yet.",
    markets: [], pillars: [], registers: [],
  },
  travelInfo: {
    headerKicker: "Operational reference",
    headerTitle: "Travel Info",
    headerNote: "Travel info not configured yet.",
    contacts: null,
    sections: [],
  },
  onboardExperience: {
    headerKicker: "Onboard amenities",
    headerTitle: "Onboard Experience",
    headerSubtitle: "Onboard experience not configured yet.",
    sections: [],
  },
  usp: {
    headerKicker: "Unique selling points",
    headerSubtitle: "USPs not configured yet.",
    sections: [],
  },
  offers: {
    headerSubtitle: "Offers not configured yet.",
    offers: [], notes: [],
  },
  resources: {
    guidelinesPdf: null, cheatSheetEnabled: false, vault: [], vaultUnderConstruction: true,
  },
  monthlyPlanning: {
    pillarsEnglish: [], pillarsItalian: [], offersSnapshot: [], markets: [],
    englishMarketLabel: "English market", italianMarketLabel: "Italian market",
    englishAudienceLine: "Not configured yet.", italianAudienceLine: "Not configured yet.",
  },
  socialMediaExpert: { platforms: [] },
  contentIdeas: { themes: [] },
  copywriter: {
    promptPlaceholderEn: "Describe the post.",
    promptPlaceholderIt: "Descrivi il post.",
  },
};

