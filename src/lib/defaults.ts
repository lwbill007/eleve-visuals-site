import type {
  AboutContent,
  BookingOptions,
  BookingTermsContent,
  BrandStory,
  ContactPageContent,
  HeroContent,
  PageCopy,
  ServicesPageIntro,
  ServicesPageContent,
  SessionsApplicationContent,
  SessionsContent,
  HomepageContent,
  NavigationConfig,
  PortfolioPageContent,
  SiteConfig,
  FaqItem,
} from "./types";

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  name: "ÉLEVÉ Visuals",
  creator: "Bill",
  tagline: "Cinematic visual storytelling for brands, artists, and athletes.",
  description:
    "Premium photography, videography, and creative direction based in Sacramento and the Bay Area. Intentional visuals for people who refuse to look ordinary.",
  url: "https://elevevisuals.com",
  email: "hello@elevevisuals.com",
  phone: "",
  instagram: "elevevisuals",
  instagramUrl: "https://instagram.com/elevevisuals",
  tiktok: "",
  tiktokUrl: "",
  location: "Sacramento ↔ Bay Area",
  serviceArea: "Sacramento, San Francisco Bay Area, and select destinations",
  responseTime: "Within 24–48 hours on business days",
  businessHours: "By appointment",
  logo: null,
  favicon: null,
  seoTitle: "ÉLEVÉ Visuals — Premium Photography & Film",
  seoDescription:
    "Cinematic photography, video production, and creative direction for brands, artists, and athletes.",
  copyrightText: "© ÉLEVÉ Visuals. All rights reserved.",
};

export const DEFAULT_NAVIGATION: NavigationConfig = {
  navLinks: [
    { label: "Work", href: "/portfolio" },
    { label: "Services", href: "/services" },
    { label: "Sessions", href: "/sessions" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  footerLinks: [
    { label: "Portfolio", href: "/portfolio" },
    { label: "Book a Project", href: "/book" },
    { label: "Booking Terms", href: "/booking-terms" },
  ],
  footerText: "Cinematic visual storytelling for brands, artists, and athletes.",
};

export const DEFAULT_HOMEPAGE: HomepageContent = {
  sections: [
    { id: "featured-work", label: "Featured Work", enabled: true },
    { id: "services", label: "Services", enabled: true },
    { id: "sessions", label: "ÉLEVÉ Sessions", enabled: true },
    { id: "brand-story", label: "Brand Story", enabled: true },
    { id: "testimonials", label: "Testimonials", enabled: true },
    { id: "cta", label: "Call to Action", enabled: true },
  ],
  featuredSessionVolumeId: null,
  banner: null,
};

export const DEFAULT_HERO: HeroContent = {
  headline: "Visuals that move with intention.",
  subheadline:
    "Photography, film, and creative direction for brands, artists, and athletes who demand more than content — they demand presence.",
  description: "",
  primaryCta: { label: "Book a Shoot", href: "/book" },
  secondaryCta: { label: "View Portfolio", href: "/portfolio" },
  image: null,
  imageAlt: "",
  videoUrl: null,
};

export const DEFAULT_BRAND_STORY: BrandStory = {
  eyebrow: "Why ÉLEVÉ",
  headline: "Elevated isn't a look. It's a standard.",
  body: [
    "ÉLEVÉ Visuals was built on one belief: your image should feel as considered as your craft. Whether you're launching a brand, building a personal archive, or documenting a moment that matters — the visuals need to carry weight.",
    "I'm Bill — photographer, director, and the person behind the lens. I work with athletes, artists, founders, and creatives across Sacramento and the Bay Area, producing work that sits somewhere between editorial and cinema.",
    "No rushed shoots. No generic deliverables. Every project starts with direction, ends with intention, and leaves you with assets you're proud to put your name on.",
  ],
  stats: [],
};

export const DEFAULT_FAQ: FaqItem[] = [
  {
    question: "How far in advance should I book?",
    answer:
      "For standard shoots, 2–4 weeks is ideal. For events or larger productions, 4–8 weeks gives us room to plan properly. Rush projects are considered based on availability.",
  },
  {
    question: "Do you travel outside Sacramento and the Bay Area?",
    answer:
      "Yes. Sacramento and the Bay Area are home base, but I regularly travel for projects. Travel fees are quoted based on location and scope.",
  },
  {
    question: "What's included in a typical shoot?",
    answer:
      "Every project includes pre-production planning, the shoot itself, professional editing, and delivery in web and print-ready formats. Specific deliverables vary by package — see Services for details.",
  },
  {
    question: "Do you require a deposit?",
    answer:
      "Yes. A 50% deposit secures your date. The remaining balance is due upon delivery of final assets. Deposits are non-refundable but may be rescheduled with 72+ hours notice.",
  },
  {
    question: "How long until I receive my files?",
    answer:
      "Standard turnaround is 7–14 business days. Rush delivery is available for an additional fee. Timeline is confirmed before booking.",
  },
];

export const DEFAULT_CONTACT_PAGE: ContactPageContent = {
  headline: "Let's build something worth framing.",
  subheadline:
    "Have a project in mind, a question about availability, or just want to talk through an idea? Send a message — I read every inquiry personally.",
  formNote:
    "For detailed project requests, use the booking form for faster turnaround.",
  bookingLink: "/book",
  calendarUrl: null,
};

export const DEFAULT_ABOUT: AboutContent = {
  headline: "The person behind the frame.",
  intro:
    "I'm Bill — a visual director based between Sacramento and the Bay Area. ÉLEVÉ Visuals is my studio for work that refuses to be forgettable.",
  story: [
    "I started shooting because I was obsessed with how light, composition, and timing could turn an ordinary moment into something that felt permanent. That obsession turned into a career — working with athletes pushing their limits, artists building their identity, and brands that understand image is strategy.",
    "ÉLEVÉ means elevated — not in the flashy sense, but in the standard you hold yourself to. Every frame should feel deliberate. Every project should have a point of view.",
    "I've spent years refining a process that's part creative direction, part production, and entirely focused on making you look like the best version of what you're building.",
  ],
  philosophy: {
    headline: "What ÉLEVÉ stands for",
    pillars: [
      {
        title: "Intention",
        description:
          "Nothing is accidental. From mood boards to final color grade, every decision serves the story.",
      },
      {
        title: "Presence",
        description:
          "Your visuals should command attention without shouting. Quiet confidence, not noise.",
      },
      {
        title: "Craft",
        description:
          "Technical excellence is the baseline. The difference is in the eye, the direction, and the edit.",
      },
    ],
  },
  process: {
    headline: "How I work",
    steps: [
      {
        step: "01",
        title: "Discovery",
        description:
          "We talk scope, vision, references, and deliverables. I ask the questions that shape the shoot before a camera comes out.",
      },
      {
        step: "02",
        title: "Direction",
        description:
          "Mood, location, wardrobe, lighting plan. You get a clear creative direction so everyone shows up aligned.",
      },
      {
        step: "03",
        title: "Production",
        description:
          "Shoot day is focused and efficient. I direct, capture, and adapt in real time while keeping the energy right.",
      },
      {
        step: "04",
        title: "Delivery",
        description:
          "Edited, color-graded, and delivered in formats ready for web, print, and social. Revisions included within scope.",
      },
    ],
  },
  trust: {
    headline: "Why clients work with ÉLEVÉ",
    points: [
      "Direct access to me — no account managers, no middlemen",
      "Clear pricing, clear timelines, clear deliverables",
      "Work that translates across platforms — social, web, print, and press",
      "A process built for creatives who take their image seriously",
    ],
  },
  image: null,
  imageAlt: "",
};

export const DEFAULT_SESSIONS: SessionsContent = {
  title: "ÉLEVÉ Sessions",
  tagline: "An exclusive in-house creative series.",
  theme: "After Dark",
  themeDescription:
    "A nocturnal visual study — shadow, texture, and controlled tension. Think editorial portraiture meets underground cinema.",
  heroImage: null,
  heroImageAlt: "ÉLEVÉ Sessions",
  description: [
    "ÉLEVÉ Sessions is a curated creative event — part shoot, part collaboration, part experience. It's where photographers, models, stylists, and creatives come together under a unified visual theme to produce work that wouldn't exist anywhere else.",
    "Each session is limited in capacity, tightly art-directed, and designed to give every participant portfolio-grade material. This isn't an open mic — it's an invitation-only production with a clear creative vision.",
    "Applications are reviewed individually. If your work, energy, and aesthetic align with the session theme, you'll receive details on date, location, and participation requirements.",
  ],
  mood: {
    headline: "Visual mood",
    keywords: ["Low light", "Editorial", "Monochrome lean", "Texture-rich", "Intentional"],
    description:
      "The palette is restrained — deep blacks, warm skin tones, single-source lighting. Wardrobe should complement, not compete. Every participant is part of the frame, not just in it.",
  },
  expectations: {
    headline: "What to expect",
    items: [
      "A fully art-directed set with professional lighting and styling support",
      "Structured shooting blocks with clear creative direction",
      "Individual portfolio selects delivered post-session",
      "Collaboration with other vetted creatives in the room",
      "A professional, focused environment — not a chaotic content day",
    ],
  },
  dressCode: {
    headline: "Creative direction & dress code",
    description:
      "Think elevated streetwear, monochrome layers, minimal jewelry, clean silhouettes. Avoid loud logos, busy patterns, and anything that pulls focus from the frame. Specific wardrobe notes will be sent to approved applicants.",
  },
  eventDetails: {
    date: "TBA",
    time: "TBA",
    location: "Sacramento, CA — shared upon acceptance",
    capacity: "Limited capacity",
    applicationDeadline: "Rolling — apply early",
  },
  faq: [
    {
      question: "Is there a fee to participate?",
      answer:
        "Session details including any participation fee are shared with approved applicants. Fees cover production costs, editing, and deliverables.",
    },
    {
      question: "Do I need professional experience?",
      answer:
        "Experience level varies by role. We review portfolios and applications individually — emerging creatives with strong work are welcome to apply.",
    },
    {
      question: "Will I receive edited photos?",
      answer:
        "Yes. Approved participants receive a curated selection of edited images from the session for portfolio and personal use, per the media release terms.",
    },
    {
      question: "Can I bring my own team?",
      answer:
        "ÉLEVÉ Sessions are curated collaborations. If you're applying as a model or subject, come solo. If you're applying as a photographer or videographer, note your equipment and style in the application.",
    },
    {
      question: "What if I'm not selected?",
      answer:
        "Applications are reviewed for each session theme. If you're not selected this round, you're welcome to reapply for future sessions — themes and needs change.",
    },
  ],
  applyCta: { label: "Apply for ÉLEVÉ Sessions", href: "/sessions/apply" },
};

export const DEFAULT_SESSIONS_APPLICATION: SessionsApplicationContent = {
  headline: "Apply for ÉLEVÉ Sessions",
  subheadline:
    "This is an application, not a signup form. Tell us who you are, what you create, and why you belong in the room.",
  successTitle: "Application received.",
  successMessage:
    "Thank you for applying to ÉLEVÉ Sessions. Every application is reviewed personally — you'll hear back within 5–7 business days if your work and profile align with the current session theme.",
  nextSteps: [
    "Review of your portfolio and application responses",
    "Direct follow-up if selected for the current session",
    "Session details, dress code, and logistics sent upon acceptance",
    "If not selected this round, you're welcome to reapply for future sessions",
  ],
  minAge: 18,
};

export const DEFAULT_SERVICES_INTRO: ServicesPageIntro = {
  headline: "Crafting Visual Stories That Endure",
  subheadline:
    "ÉLEVÉ Visuals creates premium photography, film, and creative direction for brands, artists, athletes, and campaigns that demand more than content — they demand presence.",
};

export const DEFAULT_SERVICES_PAGE: ServicesPageContent = {
  hero: {
    eyebrow: "Services",
    headline: "Crafting Visual Stories That Endure",
    subheadline:
      "ÉLEVÉ Visuals creates premium photography, film, and creative direction for brands, artists, athletes, and campaigns that demand more than content — they demand presence.",
    image: null,
    imageAlt: "ÉLEVÉ Visuals production",
    videoUrl: null,
  },
  sections: [
    {
      slug: "photography",
      eyebrow: "Photography",
      headline: "Images That Outlive the Moment",
      description:
        "Portrait sessions, brand campaigns, and editorial imagery — every frame composed with intentional light, direction, and restraint. Photography that feels cinematic, not commercial.",
      capabilities: [
        "Portraits",
        "Editorials",
        "Campaigns",
        "Athletes",
        "Events",
        "Lifestyle",
        "Product Photography",
      ],
      ctaLabel: "Book Photography",
      ctaHref: "/book",
    },
    {
      slug: "videography",
      eyebrow: "Video Production",
      headline: "Stories Designed to Move People",
      description:
        "Brand films, music visuals, and documentary content built for audiences who feel before they scroll. Motion with narrative weight, cinematic grade, and platform-ready delivery.",
      capabilities: [
        "Brand Films",
        "Commercials",
        "Music Visuals",
        "Documentary Content",
        "Event Coverage",
        "Interviews",
        "Social Media Campaigns",
        "Behind-the-Scenes Productions",
      ],
      ctaLabel: "Book Video Production",
      ctaHref: "/book",
    },
    {
      slug: "creative-direction",
      eyebrow: "Creative Direction",
      headline: "From Vision to Execution",
      description:
        "The full arc from concept to rollout — mood boards, art direction, production planning, and brand world building for clients who need a cohesive visual identity, not just a shoot.",
      capabilities: [
        "Campaign Development",
        "Art Direction",
        "Mood Boards",
        "Visual Identity",
        "Story Development",
        "Production Planning",
        "Rollout Strategy",
        "Brand World Building",
      ],
      ctaLabel: "Start a Project",
      ctaHref: "/book",
    },
  ],
  process: {
    eyebrow: "Signature Process",
    headline: "How every production unfolds",
    subheadline:
      "A refined workflow designed for clarity, creative depth, and exceptional delivery — from first conversation to final files.",
    steps: [
      {
        step: "01",
        title: "Discovery",
        description:
          "We define goals, audience, references, and deliverables. The right questions shape the work before production begins.",
      },
      {
        step: "02",
        title: "Strategy",
        description:
          "Scope, timeline, and creative approach are aligned. Every decision serves the story you need to tell.",
      },
      {
        step: "03",
        title: "Creative Development",
        description:
          "Mood boards, shot lists, casting, and styling direction — the visual language is built with intention.",
      },
      {
        step: "04",
        title: "Production",
        description:
          "On set with cinema-grade equipment, clear direction, and a calm, professional environment.",
      },
      {
        step: "05",
        title: "Post-Production",
        description:
          "Editing, color grading, sound design, and refinement until every frame meets the standard.",
      },
      {
        step: "06",
        title: "Delivery",
        description:
          "Final assets delivered in web, print, and platform-optimized formats — ready to publish.",
      },
    ],
  },
  whyEleve: {
    eyebrow: "Why ÉLEVÉ",
    headline: "A studio built for ambitious work",
    items: [
      {
        title: "Cinematic Storytelling",
        description:
          "Every project is approached with narrative intent — imagery that feels editorial, not generic.",
      },
      {
        title: "Luxury Visual Standards",
        description:
          "Refined composition, intentional lighting, and finishing that holds up at any scale.",
      },
      {
        title: "Tailored Creative Direction",
        description:
          "No template packages. Scope and vision are shaped around your brand, not a price sheet.",
      },
      {
        title: "End-to-End Production",
        description:
          "From concept through delivery — one team, one standard, one cohesive visual world.",
      },
      {
        title: "Collaborative Process",
        description:
          "You are involved at every stage. Clear communication, no surprises on shoot day.",
      },
      {
        title: "Attention to Detail",
        description:
          "The difference is in the margins — pacing, color, texture, and the edit that ties it together.",
      },
    ],
  },
  clientExperience: {
    eyebrow: "Client Experience",
    headline: "What working together feels like",
    subheadline:
      "A professional, transparent process designed to make ambitious projects feel effortless.",
    steps: [
      {
        title: "Initial Consultation",
        description:
          "We discuss your vision, goals, timeline, and budget. Every inquiry is reviewed personally.",
      },
      {
        title: "Creative Planning",
        description:
          "Mood boards, shot lists, and logistics are finalized before cameras roll.",
      },
      {
        title: "Production Day",
        description:
          "A focused, well-directed shoot with clear creative leadership on set.",
      },
      {
        title: "Editing & Refinement",
        description:
          "Professional post-production with structured revision rounds built into scope.",
      },
      {
        title: "Final Delivery",
        description:
          "Polished assets delivered on time — web-ready, print-ready, and platform-optimized.",
      },
    ],
  },
  featuredWork: {
    eyebrow: "Featured Work",
    headline: "Proof in the portfolio",
    subheadline:
      "A curated selection of recent projects across photography, film, and creative direction.",
  },
  faq: {
    eyebrow: "FAQ",
    headline: "Common questions",
    items: [
      {
        question: "How does the booking process work?",
        answer:
          "Submit the booking form with your project details. Every inquiry is reviewed personally — expect a response within 24–48 hours with availability, scope recommendations, and next steps. A 50% deposit secures your date upon confirmation.",
      },
      {
        question: "What are typical turnaround times?",
        answer:
          "Standard delivery is 7–14 business days after the shoot. Rush timelines may be available for an additional fee. Exact turnaround is confirmed in your quote before booking.",
      },
      {
        question: "Do you travel for projects?",
        answer:
          "Yes. Sacramento and the Bay Area are home base, but I regularly travel for brands, athletes, and campaigns nationwide. Travel fees are quoted based on location and production scope.",
      },
      {
        question: "What usage rights are included?",
        answer:
          "Unless otherwise agreed, you receive a license to use delivered assets for the scoped project. ÉLEVÉ Visuals retains copyright and may use work for portfolio purposes unless a private-usage agreement is arranged in advance.",
      },
      {
        question: "What deliverables can I expect?",
        answer:
          "Deliverables vary by project — edited photos, short-form and long-form video, social crops, print-ready files, and creative direction decks. Everything is defined in your scope before production begins.",
      },
      {
        question: "How is pricing determined?",
        answer:
          "Every project is quoted individually based on scope, production days, deliverables, and timeline. Starting rates are listed per service, but final pricing reflects the creative and logistical requirements of your specific project.",
      },
    ],
  },
  finalCta: {
    headline: "Create Something Worth Remembering",
    subheadline:
      "Whether you are launching a campaign, building a personal brand, or documenting a defining moment — let's make it unforgettable.",
    primaryLabel: "Book a Project",
    primaryHref: "/book",
  },
};

export const DEFAULT_BOOKING_OPTIONS: BookingOptions = {
  serviceTypes: [
    "Portrait Photography",
    "Creative Editorial",
    "Brand Campaign",
    "Product Photography",
    "Athlete Session",
    "Graduation Photos",
    "Couple Session",
    "Event Photography",
    "Event Video Coverage",
    "Music Visual",
    "Creative Direction",
    "BTS Content",
    "Custom Project",
  ],
  sessionSettings: ["Indoor", "Outdoor", "Studio", "On Location"],
  durations: ["30 Minutes", "1 Hour", "2 Hours", "Half Day", "Full Day", "Unsure"],
  budgetRanges: [
    "Under $150",
    "$150–300",
    "$300–500",
    "$500–1,000",
    "$1,000+",
    "Not Sure Yet",
  ],
  deliverables: [
    "Edited Photography",
    "Cinematic Video",
    "Vertical Social Reels",
    "Behind-the-Scenes Content",
    "Creative Direction",
    "Color Grading",
    "Visual Campaign Assets",
    "Other",
  ],
  referralSources: [
    "Instagram",
    "TikTok",
    "Google",
    "Referral",
    "Friend",
    "ÉLEVÉ Sessions",
    "Returning Client",
    "Other",
  ],
};

export const DEFAULT_PAGE_COPY: PageCopy = {
  homeCta: {
    headline: "Your next project deserves better than ordinary.",
    subheadline:
      "Book a shoot or explore the portfolio — let's build something worth framing.",
    primaryLabel: "Book a Shoot",
    primaryHref: "/book",
    secondaryLabel: "View Portfolio",
    secondaryHref: "/portfolio",
  },
  portfolioHero: {
    headline: "Work that speaks before you do.",
    subheadline:
      "Photography, film, and creative direction across portraits, brands, athletes, and events.",
  },
  portfolioCta: {
    headline: "See yourself in the portfolio?",
    subheadline: "Let's create something that belongs here.",
    primaryLabel: "Book a Shoot",
    primaryHref: "/book",
  },
  servicesCta: {
    headline: "Every project starts with a conversation.",
    primaryLabel: "Request a Booking",
    primaryHref: "/book",
    secondaryLabel: "View Portfolio",
    secondaryHref: "/portfolio",
  },
  aboutCta: {
    headline: "Ready to work together?",
    primaryLabel: "Book a Shoot",
    primaryHref: "/book",
    secondaryLabel: "View Portfolio",
    secondaryHref: "/portfolio",
  },
  sessionsCta: {
    headline: "Think you belong in the room?",
    subheadline: "Applications are reviewed individually. Show us your work.",
    primaryLabel: "Apply Now",
    primaryHref: "/sessions/apply",
  },
  bookPage: {
    headline: "Let's Create Something Unforgettable",
    subheadline:
      "Every project begins with a conversation. Tell us about your vision, goals, and creative direction, and we'll craft an experience tailored to your story.",
    notes: [
      "Responses within 24–48 hours",
      "Based in Sacramento, available for travel",
      "Custom quotes for every project",
    ],
    successTitle: "Inquiry received.",
    successMessage:
      "Thank you for reaching out. Your project will be personally reviewed — expect a response within 24–48 hours with availability, next steps, and a customized proposal.",
    nextSteps: [
      "Personal review of your vision, scope, and preferred dates",
      "Direct follow-up with availability and creative recommendations",
      "Customized proposal tailored to your goals and budget",
      "Pre-production planning once your project is confirmed",
    ],
  },
};

export const DEFAULT_BOOKING_TERMS: BookingTermsContent = {
  headline: "Booking Terms",
  intro:
    "These terms apply to all photography, videography, and creative direction bookings with ÉLEVÉ Visuals. By submitting the booking form, you agree to the policies below.",
  sections: [
    {
      title: "Deposits & payment",
      body:
        "A 50% deposit is required to secure your shoot date. The remaining balance is due upon delivery of final assets unless otherwise agreed in writing. Deposits are non-refundable but may be rescheduled with at least 72 hours notice, subject to availability.",
    },
    {
      title: "Turnaround & delivery",
      body:
        "Standard turnaround is 7–14 business days after the shoot unless a different timeline is confirmed in your quote. Rush delivery may be available for an additional fee. Final file formats and deliverables are defined in your project scope before booking.",
    },
    {
      title: "Usage rights",
      body:
        "Unless otherwise specified in your agreement, you receive a license to use delivered assets for the agreed project scope. ÉLEVÉ Visuals retains copyright and may use work for portfolio and marketing purposes unless a private-usage agreement is arranged in advance.",
    },
    {
      title: "Cancellation & rescheduling",
      body:
        "Client cancellations with less than 72 hours notice forfeit the deposit. Weather, venue, or force-majeure reschedules will be handled in good faith with priority rebooking where possible. ÉLEVÉ Visuals reserves the right to reschedule if safety or production conditions require it.",
    },
    {
      title: "Revisions & scope",
      body:
        "Each project includes a defined number of revision rounds as outlined in your quote. Additional revisions or scope changes may incur extra fees. Reference materials, shot lists, and creative direction should be shared before shoot day to keep production efficient.",
    },
  ],
};

export const DEFAULT_SERVICES = [
  {
    slug: "photography",
    title: "Photography",
    tagline: "Still frames with cinematic weight.",
    description:
      "Portrait sessions, brand campaigns, product imagery, and editorial shoots — all shot with intentional lighting, composition, and direction. Every session is planned before the shutter clicks.",
    forWhom:
      "Artists, athletes, founders, brands, and anyone who needs imagery that holds up on a billboard and in a feed.",
    includes: [
      "Pre-shoot consultation and creative direction",
      "Professional shoot (half-day or full-day)",
      "Color grading and retouching",
      "Web and print-ready delivery",
      "Usage guidance for social, web, and press",
    ],
    startingPrice: "From $850",
    imageAlt: "Photography by ÉLEVÉ Visuals",
    sortOrder: 0,
  },
  {
    slug: "videography",
    title: "Videography",
    tagline: "Motion that carries the same standard.",
    description:
      "Brand films, promo content, event recaps, and short-form video built for platforms that reward quality. Shot with cinema-grade equipment and edited with a director's eye.",
    forWhom:
      "Brands launching products, artists releasing music, athletes building personal brands, and events that deserve more than a phone recording.",
    includes: [
      "Concept and shot list development",
      "Single or multi-camera production",
      "Professional audio capture",
      "Color grade and sound design",
      "Delivery in platform-optimized formats",
    ],
    startingPrice: "From $1,500",
    imageAlt: "Videography by ÉLEVÉ Visuals",
    sortOrder: 1,
  },
  {
    slug: "creative-direction",
    title: "Creative Direction",
    tagline: "The vision before the camera rolls.",
    description:
      "Full creative oversight — mood boards, shot lists, styling direction, casting guidance, and production planning. For clients who want a cohesive visual identity, not just a shoot.",
    forWhom:
      "Brands refreshing their image, artists defining their aesthetic, and teams that need a visual strategist, not just a shooter.",
    includes: [
      "Brand and visual audit",
      "Mood board and reference deck",
      "Shot list and production plan",
      "On-set creative direction",
      "Post-production oversight",
    ],
    startingPrice: "Custom quote",
    imageAlt: "Creative direction by ÉLEVÉ Visuals",
    sortOrder: 2,
  },
  {
    slug: "brand-content",
    title: "Brand Content",
    tagline: "A visual system, not a single shoot.",
    description:
      "Multi-asset content packages designed for ongoing brand presence — hero imagery, lifestyle shots, social crops, and campaign-ready files delivered as a unified system.",
    forWhom:
      "Growing brands, DTC companies, and founders who need a bank of premium content without hiring an in-house team.",
    includes: [
      "Content strategy session",
      "Multi-look shoot day",
      "Photo and video deliverables",
      "Social-optimized crops and formats",
      "Brand usage guide",
    ],
    startingPrice: "From $2,500",
    imageAlt: "Brand content by ÉLEVÉ Visuals",
    sortOrder: 3,
  },
  {
    slug: "event-coverage",
    title: "Event Coverage",
    tagline: "Document the energy, not just the schedule.",
    description:
      "Live event photography and video with a documentary approach — candid moments, atmosphere, and key coverage without the stiff corporate feel.",
    forWhom:
      "Launch parties, private events, performances, brand activations, and any gathering worth remembering.",
    includes: [
      "Pre-event planning call",
      "Full event coverage (photo and/or video)",
      "Same-day preview selects (optional)",
      "Edited gallery within 7–10 days",
      "Social-ready highlight reel (video add-on)",
    ],
    startingPrice: "From $1,200",
    imageAlt: "Event coverage by ÉLEVÉ Visuals",
    sortOrder: 4,
  },
  {
    slug: "social-media-content",
    title: "Social Media Content",
    tagline: "Built for the scroll, shot for the save.",
    description:
      "Short-form photo and video content optimized for Instagram, TikTok, and paid social. Fast turnaround without sacrificing the ÉLEVÉ standard.",
    forWhom:
      "Personal brands, influencers, artists, and businesses that need consistent, premium content on a recurring basis.",
    includes: [
      "Content planning session",
      "Half-day content shoot",
      "15–30 edited assets (photo and/or video)",
      "Platform-specific formatting",
      "Monthly retainer options available",
    ],
    startingPrice: "From $950",
    imageAlt: "Social media content by ÉLEVÉ Visuals",
    sortOrder: 5,
  },
];

export const DEFAULT_PORTFOLIO_PAGE: PortfolioPageContent = {
  hero: {
    eyebrow: "Selected Work",
    headline: "Work that speaks before you do.",
    subheadline: "Photography, film, and creative direction for brands, athletes, and artists.",
    description:
      "An archive of intentional visuals — portraits, campaigns, events, and editorial projects crafted with cinematic precision.",
    image: null,
    imageAlt: "ÉLEVÉ Visuals portfolio",
    videoUrl: null,
  },
  stats: [],
  categories: [
    "Portraits",
    "Brands",
    "Athletes",
    "Events",
    "Creative Direction",
    "Video",
    "BTS",
    "Editorial",
    "Lifestyle",
  ],
  emptyState: {
    headline: "New work is currently in production.",
    subheadline: "Check back soon or explore another collection.",
    ctaLabel: "Book a Project",
    ctaHref: "/book",
  },
};

export const CONTENT_KEYS = {
  siteConfig: "site-config",
  hero: "hero",
  brandStory: "brand-story",
  faq: "faq",
  contactPage: "contact-page",
  about: "about",
  sessions: "sessions",
  sessionsApplication: "sessions-application",
  servicesIntro: "services-intro",
  servicesPage: "services-page",
  bookingOptions: "booking-options",
  bookingTerms: "booking-terms",
  pageCopy: "page-copy",
  homepage: "homepage",
  navigation: "navigation",
  portfolioPage: "portfolio-page",
} as const;
