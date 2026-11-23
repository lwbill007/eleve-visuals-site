/**
 * Role-specific application questions. Pure data shared by the public form
 * (which fields to show) and the submit route (which fields to accept/require).
 * Answers are stored in Submission.data.roleDetails, keyed by field id.
 */

export type RoleDetailField = {
  id: string;
  label: string;
  /** Applicant roles (SESSION_APPLICATION_ROLES values) that see this field. */
  roles: readonly string[];
  placeholder?: string;
  required: boolean;
  maxLength: number;
  /** Fixed choices render as a select; otherwise a text area. */
  options?: readonly string[];
  /** Only shown when the volume's settings turn it on. */
  setting?: "askFaceCoveringComfort";
};

const STYLING_ROLES = ["Stylist", "Makeup Artist", "Hair Artist"] as const;
const CAMERA_ROLES = ["Photographer", "Videographer"] as const;
const OTHER_ROLES = ["Creative Director", "Designer", "Content Creator", "Other"] as const;

export const FACE_COVERING_OPTIONS = [
  "Comfortable with masks and face coverings",
  "Comfortable after discussing the concept",
  "Prefer not to wear face coverings",
] as const;

export const ROLE_DETAIL_FIELDS: readonly RoleDetailField[] = [
  {
    id: "model-sizes",
    label: "Clothing sizes",
    roles: ["Model"],
    placeholder: "Height, top, bottom / waist, dress and shoe size",
    required: true,
    maxLength: 300,
  },
  {
    id: "model-styling",
    label: "Preferred styling",
    roles: ["Model"],
    placeholder: "Looks you're drawn to, and anything you won't wear",
    required: false,
    maxLength: 800,
  },
  {
    id: "model-face-covering",
    label: "Comfort with masks and face coverings",
    roles: ["Model"],
    required: true,
    maxLength: 80,
    options: FACE_COVERING_OPTIONS,
    setting: "askFaceCoveringComfort",
  },
  {
    id: "styling-specialty",
    label: "Specialty and kit",
    roles: STYLING_ROLES,
    placeholder: "Fashion, hair or makeup focus; kit, pulls or wardrobe access you can bring",
    required: false,
    maxLength: 1000,
  },
  {
    id: "camera-equipment",
    label: "Equipment and specialty",
    roles: CAMERA_ROLES,
    placeholder: "Bodies, lenses, lighting; stills, motion, BTS",
    required: false,
    maxLength: 1000,
  },
  {
    id: "other-contribution",
    label: "What you would do on set",
    roles: OTHER_ROLES,
    placeholder: "Your craft and how it fits this production",
    required: false,
    maxLength: 1000,
  },
];

export type RoleDetailSettings = { askFaceCoveringComfort?: boolean };

/** Fields an applicant with these roles should see for this volume. */
export function roleDetailFieldsFor(
  roles: readonly string[],
  settings: RoleDetailSettings
): RoleDetailField[] {
  return ROLE_DETAIL_FIELDS.filter(
    (field) =>
      field.roles.some((role) => roles.includes(role)) &&
      (!field.setting || settings[field.setting] === true)
  );
}

/**
 * Keep only answers for fields this applicant can see, trimmed and capped.
 * Returns the cleaned answers and the ids of missing required fields.
 */
export function cleanRoleDetails(
  raw: unknown,
  roles: readonly string[],
  settings: RoleDetailSettings
): { details: Record<string, string>; missing: string[]; invalid: string[] } {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const details: Record<string, string> = {};
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const field of roleDetailFieldsFor(roles, settings)) {
    const value = typeof source[field.id] === "string" ? (source[field.id] as string).trim() : "";
    if (value.length > field.maxLength) {
      invalid.push(field.id);
      continue;
    }
    if (field.options && value && !field.options.includes(value)) {
      invalid.push(field.id);
      continue;
    }
    if (!value) {
      if (field.required) missing.push(field.id);
      continue;
    }
    details[field.id] = value;
  }
  return { details, missing, invalid };
}

/** Admin display: label/value pairs in field order. */
export function describeRoleDetails(details: unknown): { label: string; value: string }[] {
  if (!details || typeof details !== "object") return [];
  const record = details as Record<string, unknown>;
  return ROLE_DETAIL_FIELDS.flatMap((field) =>
    typeof record[field.id] === "string" && record[field.id]
      ? [{ label: field.label, value: record[field.id] as string }]
      : []
  );
}
