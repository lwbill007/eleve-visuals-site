import type {
  SessionApplicationData,
  SessionApplicationQuestion,
  SessionApplicationSettings,
  SessionVolumeDTO,
} from "./types";

export const APPLICATION_STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Creative Profile" },
  { id: 3, label: "Portfolio" },
  { id: 4, label: "Session Questions" },
  { id: 5, label: "Logistics" },
  { id: 6, label: "Agreements" },
] as const;

export const MAX_PORTFOLIO_UPLOADS = 5;

export const DEFAULT_APPLICATION_QUESTIONS: SessionApplicationQuestion[] = [
  {
    id: "why-participate",
    label: "Why do you want to participate?",
    placeholder: "What draws you to ÉLEVÉ Sessions?",
    maxLength: 3000,
    required: true,
  },
  {
    id: "theme-fit",
    label: "What about this theme speaks to you?",
    placeholder: "How does your aesthetic align with this volume?",
    maxLength: 3000,
    required: true,
  },
  {
    id: "contribution",
    label: "What would you contribute creatively?",
    placeholder: "Describe your vision, skills, or perspective for this production.",
    maxLength: 3000,
    required: true,
  },
  {
    id: "previous-session",
    label: "Have you attended an ÉLEVÉ Session before?",
    placeholder: "If yes, which volume and what was your role?",
    maxLength: 1500,
    required: false,
  },
];

export const DEFAULT_SESSION_APPLICATION_SETTINGS: SessionApplicationSettings = {
  maxCapacity: null,
  waitlistEnabled: true,
  autoCloseOnDeadline: true,
  autoCloseOnCapacity: true,
  requirePortfolioUpload: false,
  requireRoleSelection: true,
  customConfirmationMessage: "",
  questions: DEFAULT_APPLICATION_QUESTIONS,
  emailTemplates: {
    submissionConfirmation:
      "Thank you for applying to ÉLEVÉ Sessions. Your application has been received and will be reviewed by our team. Selected participants will be contacted directly.",
    acceptance:
      "Congratulations — you have been selected for this ÉLEVÉ Session. We will send production details and next steps shortly.",
    waitlist:
      "Thank you for your application. You have been placed on the waitlist for this session. We will contact you if a spot becomes available.",
    rejection:
      "Thank you for your interest in ÉLEVÉ Sessions. After careful review, we are unable to offer a spot for this volume. We encourage you to apply for future sessions.",
    followUp:
      "We have an update regarding your ÉLEVÉ Sessions application. Please check your email for details.",
  },
  notifyAdminOnSubmission: true,
  notifyApplicantOnSubmission: true,
};

export function applicationStorageKey(slug: string): string {
  return `eleve-session-application:${slug}`;
}

export function initialApplicationData(
  volume?: Pick<SessionVolumeDTO, "id" | "slug" | "title">,
  questions?: SessionApplicationQuestion[]
): SessionApplicationData {
  const qs = questions ?? DEFAULT_APPLICATION_QUESTIONS;
  return {
    fullName: "",
    email: "",
    phone: "",
    cityState: "",
    instagram: "",
    portfolioWebsite: "",
    roles: [],
    experience: "",
    portfolioImages: [],
    portfolioLink: "",
    demoReel: "",
    youtube: "",
    vimeo: "",
    behance: "",
    driveLink: "",
    questionAnswers: qs.map((q) => ({ id: q.id, question: q.label, answer: "" })),
    availabilityConfirm: false,
    transportationConfirm: false,
    creativeDirectionConfirm: false,
    emergencyContact: "",
    agreementCurated: false,
    agreementNoGuarantee: false,
    agreementGuidelines: false,
    agreementAccurate: false,
    sessionVolumeId: volume?.id,
    sessionVolumeSlug: volume?.slug,
    sessionVolumeTitle: volume?.title,
  };
}

export function parseApplicationSettings(raw: string | null | undefined): SessionApplicationSettings {
  if (!raw) return { ...DEFAULT_SESSION_APPLICATION_SETTINGS };
  try {
    const parsed = JSON.parse(raw) as Partial<SessionApplicationSettings>;
    return {
      ...DEFAULT_SESSION_APPLICATION_SETTINGS,
      ...parsed,
      questions:
        parsed.questions && parsed.questions.length > 0
          ? parsed.questions
          : DEFAULT_SESSION_APPLICATION_SETTINGS.questions,
      emailTemplates: {
        ...DEFAULT_SESSION_APPLICATION_SETTINGS.emailTemplates,
        ...(parsed.emailTemplates ?? {}),
      },
    };
  } catch {
    return { ...DEFAULT_SESSION_APPLICATION_SETTINGS };
  }
}

export function formatApplicationId(id: string): string {
  return id.slice(-8).toUpperCase();
}

export function getApplicationRolesLabel(roles: string[]): string {
  return roles.length > 0 ? roles.join(", ") : "—";
}

export function getPrimaryRole(data: SessionApplicationData): string {
  return data.roles[0] ?? "";
}

export function toLegacyApplicationFields(data: SessionApplicationData) {
  const why = data.questionAnswers.find((q) => q.id === "why-participate")?.answer ?? "";
  const theme = data.questionAnswers.find((q) => q.id === "theme-fit")?.answer ?? "";
  return {
    role: getPrimaryRole(data),
    roles: data.roles,
    whyParticipate: why,
    themeFit: theme,
    portfolioLink: data.portfolioLink || data.portfolioWebsite || data.portfolioImages[0] || "",
    experienceLevel: data.experience ?? "",
    cityState: data.cityState,
  };
}
