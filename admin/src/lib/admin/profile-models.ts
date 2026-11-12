/**
 * Admin profile model — shared by the overview, edit, password and workspace
 * deletion screens.
 *
 * The values here mirror the Flutter admin profile UI:
 *  - `ProfileHeader` splits the display name at the first whitespace and
 *    derives initials from the first two words.
 *  - `PasswordRequirements` uses 12 characters plus uppercase, lowercase,
 *    number and special character (admin_passoword_tile_view.dart).
 *
 * The profile itself is read from the same `users/{uid}` document the Flutter
 * app uses. No new collection or profile shape was invented for the web panel.
 */

export interface AdminSelfProfile {
  uid: string
  email: string
  name: string
  photoUrl: string | null
  role: string
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
} as const

export type PasswordRuleId =
  | "minLength"
  | "uppercase"
  | "lowercase"
  | "number"
  | "special"

export interface PasswordRule {
  id: PasswordRuleId
  label: string
  met: boolean
}

/**
 * Verbose profile name split (first word = first name, remainder = last name).
 * A blank name yields empty parts instead of a fabricated "AD" card.
 */
export function splitProfileName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  }
}

/** Initials used by the profile avatar fallback (max two characters). */
export function profileInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  return initials || "AD"
}

export function validateProfileName(name: string): string | null {
  if (name.trim().length === 0) {
    return "Name is required."
  }
  return null
}

/** The exact character class from Flutter's `ValidateFields.getPasswordRules`. */
export function passwordRuleChecks(password: string): PasswordRule[] {
  return [
    {
      id: "minLength",
      label: `At least ${PASSWORD_REQUIREMENTS.minLength} characters`,
      met: password.length >= PASSWORD_REQUIREMENTS.minLength,
    },
    {
      id: "uppercase",
      label: "One uppercase character",
      met: /[A-Z]/.test(password),
    },
    {
      id: "lowercase",
      label: "One lowercase character",
      met: /[a-z]/.test(password),
    },
    {
      id: "number",
      label: "One number",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "One special character",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ]
}

export function isStrongPassword(password: string): boolean {
  return passwordRuleChecks(password).every((rule) => rule.met)
}

/** First unmet password rule, suitable for a form error message. */
export function passwordValidationMessage(password: string): string | null {
  if (password.length === 0) {
    return "New password is required."
  }
  const unmet = passwordRuleChecks(password).find((rule) => !rule.met)
  if (!unmet) {
    return null
  }
  switch (unmet.id) {
    case "minLength":
      return `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters.`
    case "uppercase":
      return "Password must contain at least one uppercase letter."
    case "lowercase":
      return "Password must contain at least one lowercase letter."
    case "number":
      return "Password must contain at least one number."
    case "special":
      return "Password must contain at least one special character."
  }
}

/** 5 MB guard for the browser photo picker (the Flutter picker is mobile-OS constrained). */
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export function validateProfilePhoto(file: Pick<File, "type" | "size">): string | null {
  if (!file.type.startsWith("image/")) {
    return "Choose an image file."
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return "Choose an image smaller than 5 MB."
  }
  return null
}

/** Build the Firestore-facing profile from the server guard's subset. */
export function adminSelfProfile(input: {
  uid: string
  email: string | null
  name: string | null | undefined
  photoUrl?: string | null
  role: string
}): AdminSelfProfile {
  return {
    uid: input.uid,
    email: input.email ?? "",
    name: input.name?.trim() || "StaffRail Admin",
    photoUrl: input.photoUrl ?? null,
    role: input.role,
  }
}
