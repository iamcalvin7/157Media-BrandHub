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
  weights: { weight: string; sample: string; className: string }[];
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

export type SocialMediaContent = {
  headerSubtitle: string;
  markets: Market[];
  pillars: PillarOverview[];
  registers: Register[];
  crossPosting?: { when: string[]; platformSpecific: string[] };
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

export type Excursion = {
  id: string;
  name: string;
  season: "Summer" | "Winter" | "Year-round";
  destinations: string[];
  description?: string;
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
  excursions: ExcursionsContent;
  resources: ResourcesContent;
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
        { weight: "Light 300", sample: "Light 300 for elegant body copy", className: "font-light text-gray-600" },
        { weight: "Regular 400", sample: "Regular 400 for UI elements", className: "font-normal text-gray-700" },
        { weight: "Bold 700", sample: "Bold 700 for headlines", className: "font-bold text-gray-900" },
        { weight: "ExtraBold 800", sample: "ExtraBold 800 — hero headings", className: "font-extrabold text-gray-900" },
      ],
    },
  },
  socialMedia: {
    headerSubtitle: "Two markets, three platforms. Each with its own audience, frame, and creative register.",
    markets: [
      {
        market: "English Market",
        audience: "Maltese locals and international English speakers",
        frame: "Malta as home base. Sicily as the irresistible neighbour.",
        note: "Instagram reuses Facebook content where possible. Platform-specific IG content is created when the Facebook post relies on a link or doesn't translate to Instagram format. All Instagram copy is in English, angled for the Maltese audience.",
        platforms: [
          { name: "Facebook", handle: "facebook.com/virtuferries", iconName: "Facebook", cadence: "25 posts per month", colorClass: "text-blue-400" },
          { name: "Instagram", handle: "instagram.com/virtuferrieslimited", iconName: "Instagram", cadence: "25 posts per month · English · Maltese audience", colorClass: "text-pink-400" },
        ],
      },
      {
        market: "Italian Market",
        audience: "Sicilians and Italian travellers",
        frame: "Sicily as home. Malta as the discovery they didn't know they needed.",
        note: "Italian market is Facebook only. No Instagram. All copy in Italian.",
        platforms: [
          { name: "Facebook", handle: "facebook.com/levacanzeMaltesi", iconName: "Facebook", cadence: "25 posts per month · Italian", colorClass: "text-blue-400" },
        ],
      },
    ],
    pillars: [
      { number: "01", title: "Why VF", desc: "Reasons to choose Virtu Ferries — speed, comfort, convenience, car option. The crossing as the obvious choice." },
      { number: "02", title: "Why Sicily", desc: "Sells the destination, not the product. Food, culture, nature, events. If they want Sicily, VF is the natural next step." },
      { number: "03", title: "VF Recommends", desc: "Curated Sicily travel content — restaurants, trails, towns, seasonal events. VF as trusted local guide, not ticket seller." },
      { number: "04", title: "Virtu Ferries Experience", desc: "On-board experience, team stories, UGC from real passengers. Real people, real crossings, real moments." },
      { number: "05", title: "Sicily Experience", desc: "Immersive, sensory Sicily — food close-ups, colour, atmosphere, light. No hard sell. Let the island do the talking." },
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
      "Everything passengers can use, do, and enjoy during the 1h 45m crossing — connectivity, premium tiers, comfort, and food & drink. Source of truth for service-led copy and answers.",
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
          "Club Class is the premium tier on board: dedicated saloon, upgraded seating, and now a complimentary Wi-Fi voucher in every ticket.",
        bullets: [
          "Dedicated Club Class saloon with upgraded seating",
          "Lounge accessible by lift",
          "Complimentary voucher for the 2-hour Starlink Internet & Streaming package — included with every Club Class ticket",
        ],
        notes: [
          {
            label: "Positioning",
            body:
              "Frame Club Class as a small uplift in price for a noticeably calmer, more comfortable crossing. The free Starlink voucher is the new headline benefit — feature it prominently in upgrade copy.",
          },
        ],
      },
    ],
    footer:
      "When writing about Wi-Fi, be precise: it is paid (€4 / 2 hours, includes streaming) for standard tickets and complimentary for Club Class. Do not describe it as \"free Wi-Fi for everyone\".",
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
          "Volcano + city day. Etna in winter (often capped with snow) paired with the baroque heart of Catania.",
      },
      {
        id: "ragusa-modica-scicli",
        name: "Ragusa Ibla, Modica & Scicli",
        season: "Winter",
        destinations: ["Ragusa Ibla", "Modica", "Scicli"],
        description:
          "Three baroque jewels of the Val di Noto — UNESCO heritage trail just minutes from Pozzallo.",
      },
      {
        id: "taormina-etna-summer",
        name: "Taormina & Mt. Etna",
        season: "Summer",
        destinations: ["Taormina", "Mt. Etna"],
        description:
          "Picturesque Taormina paired with the volcano — the classic Sicily highlight reel.",
      },
      {
        id: "syracuse-marzamemi-summer",
        name: "Syracuse & Marzamemi",
        season: "Summer",
        destinations: ["Syracuse (Ortygia)", "Marzamemi"],
        description:
          "Ancient Ortygia with its Greek and Roman theatres, then the fishing village of Marzamemi for sea, salt and seafood.",
      },
      {
        id: "catania-etna-summer",
        name: "Catania & Mt. Etna",
        season: "Summer",
        destinations: ["Catania", "Mt. Etna"],
        description:
          "Catania's markets and lava-stone streets paired with a summer ascent of Etna.",
      },
    ],
    closingNote:
      "There is only one thing we are certain of — you will enjoy Sicily.",
    sourceUrl: "https://www.virtuferries.com",
    sourceLabel: "virtuferries.com — Sicily Excursions section",
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
  monthlyPlanning: {
    pillarsEnglish: [
      { num: "01", title: "Why VF", desc: "The crossing as the obvious, easy choice — speed, comfort, car option." },
      { num: "02", title: "Why Sicily", desc: "Sells Sicily to Maltese travellers. If they want Sicily, VF is the natural next step." },
      { num: "03", title: "VF Recommends", desc: "Curated Sicily insider tips — restaurants, towns, trails, events. VF as trusted guide." },
      { num: "04", title: "Virtu Ferries Experience", desc: "On-board, crew, UGC, social proof. Real people, real crossings." },
      { num: "05", title: "Sicily Experience", desc: "Immersive, sensory Sicily content for Maltese travellers. No hard sell." },
    ],
    pillarsItalian: [
      { num: "01", title: "Why VF", desc: "The crossing from Sicily to Malta as the obvious, easy choice." },
      { num: "02", title: "Why Malta", desc: "Sells Malta to Sicilians — Valletta, Gozo, beaches, history, events. The discovery they didn't know they needed." },
      { num: "03", title: "VF Recommends Malta", desc: "Curated Malta insider tips — beaches, Valletta restaurants, Mdina, Gozo day trips, Maltese food. For a Sicilian visitor." },
      { num: "04", title: "Virtu Ferries Experience", desc: "On-board, crew, UGC, social proof from Italian/Sicilian passengers." },
      { num: "05", title: "Malta Experience", desc: "Immersive, sensory Malta content for Sicilians — Valletta colours, Maltese food, sea, light. No hard sell." },
    ],
    offersSnapshot: [
      { name: "One Day Offer", detail: "Adult return €63.60 · Child €44.60 · Light car €109 · Motorbike €69" },
      { name: "More Than One Day", detail: "Adult return €63.60 · Light car €109 · Extended to May 30, 2026" },
      { name: "Saturday Night Malta", detail: "€57/person return · 20:30 Sat dep. Pozzallo · 06:30 Sun return · Jan–Apr 2026" },
      { name: "Commercial Vehicles up to 5.9m", detail: "Round trip incl. driver: 4.5m €413+€67.60 ETS · 5.0m €520+€74.60 · 5.5m €581+€81.60 · 5.9m €676+€88.60 · 2nd driver FREE (charges only)" },
    ],
    markets: [
      { label: "English market", channels: "Facebook (English) · 25 posts/month + Instagram (English, Maltese audience) · 25 posts/month" },
      { label: "Italian market", channels: "Facebook (Italian) · 25 posts/month · Facebook only" },
    ],
    englishMarketLabel: "English market",
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

const GOZO_BLUE = "#0c6cae";
const GOZO_AMBER = "#fbbf24";
const GOZO_RED = "#dc2626";

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
      "Brand identity not configured yet. Add the brand story, tone of voice, key messages, and copy rules so every channel sounds the same.",
    brandStory: "",
    toneOfVoice: [],
    keyMessages: [],
    whatToSay: [],
    whatNotToSay: [],
  },
  assets: {
    headerSubtitle: "Visual brand assets — logos, colours, typography. Not configured yet.",
    logos: [],
    colours: [
      { name: "Primary Blue", hex: GOZO_BLUE, desc: "Provisional — replace with the agreed primary", className: "bg-[#0c6cae]" },
      { name: "Accent Amber", hex: GOZO_AMBER, desc: "Provisional — replace with the agreed accent", className: "bg-[#fbbf24]" },
      { name: "Alert Red", hex: GOZO_RED, desc: "Provisional — replace with the agreed alert colour", className: "bg-[#dc2626]" },
    ],
    logoDos: [],
    logoDonts: [],
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
      "Passenger information has not been added yet. Once filled in, this page becomes the source of truth for service-led content and AI agent answers.",
    contacts: null,
    sections: [],
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
      "Live pricing and offer details. Not configured yet — add current offers before generating promotional content.",
    offers: [],
    notes: [],
  },
  excursions: {
    headerKicker: "Destination & excursions",
    headerTitle: "Excursions",
    headerSubtitle:
      "Excursions and destination context not configured yet — once added they appear here and feed into the AI agent's brand prompt.",
    highlightGroups: [],
    excursions: [],
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
  excursions: {
    headerKicker: "Destination & excursions",
    headerTitle: "Excursions",
    headerSubtitle: "Excursions and destination context not configured yet — once added they appear here and feed into the AI agent's brand prompt.",
    highlightGroups: [],
    excursions: [],
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

