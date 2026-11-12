import { describe, expect, it } from "vitest"

import {
  adminSelfProfile,
  isStrongPassword,
  passwordRuleChecks,
  passwordValidationMessage,
  profileInitials,
  splitProfileName,
  validateProfileName,
  validateProfilePhoto,
} from "@/lib/admin/profile-models"

describe("profile name helpers", () => {
  it("splits the first word as first name and keeps the rest as last name", () => {
    expect(splitProfileName("  Alex Rivera Diaz  ")).toEqual({
      firstName: "Alex",
      lastName: "Rivera Diaz",
    })
    expect(splitProfileName("Cher")).toEqual({ firstName: "Cher", lastName: "" })
    expect(splitProfileName("   ")).toEqual({ firstName: "", lastName: "" })
  })

  it("derives the same two-character fallback initials", () => {
    expect(profileInitials("Alex Rivera")).toBe("AR")
    expect(profileInitials("  sara   khan ")).toBe("SK")
    expect(profileInitials("")).toBe("AD")
  })

  it("requires a non-blank display name", () => {
    expect(validateProfileName("   ")).toBe("Name is required.")
    expect(validateProfileName("  Alex ")).toBeNull()
  })
})

describe("admin password policy", () => {
  it("mirrors the Flutter admin checklist (12 chars + four character classes)", () => {
    const rules = passwordRuleChecks("LongEnough1!")
    expect(rules.map((rule) => [rule.id, rule.met])).toEqual([
      ["minLength", true],
      ["uppercase", true],
      ["lowercase", true],
      ["number", true],
      ["special", true],
    ])
    expect(isStrongPassword("LongEnough1!")).toBe(true)
  })

  it("reports individual unmet requirements", () => {
    expect(passwordRuleChecks("short").find((rule) => rule.id === "minLength")?.met).toBe(
      false,
    )
    expect(passwordRuleChecks("alllowercase1!").find((rule) => rule.id === "uppercase")?.met).toBe(
      false,
    )
    expect(passwordRuleChecks("ALLUPPERCASE1!").find((rule) => rule.id === "lowercase")?.met).toBe(
      false,
    )
    expect(passwordRuleChecks("NoNumberHere!").find((rule) => rule.id === "number")?.met).toBe(
      false,
    )
    expect(passwordRuleChecks("NoSpecial123").find((rule) => rule.id === "special")?.met).toBe(
      false,
    )
  })

  it("returns the first actionable password error", () => {
    expect(passwordValidationMessage("")).toBe("New password is required.")
    expect(passwordValidationMessage("Short1!")).toBe(
      "Password must be at least 12 characters.",
    )
    expect(passwordValidationMessage("longenough1!")).toBe(
      "Password must contain at least one uppercase letter.",
    )
    expect(passwordValidationMessage("LongEnough1!")).toBeNull()
  })
})

describe("profile photo validation", () => {
  it("accepts an image under 5 MB and rejects other types or oversized files", () => {
    expect(validateProfilePhoto({ type: "image/png", size: 1024 })).toBeNull()
    expect(validateProfilePhoto({ type: "application/pdf", size: 1024 })).toBe(
      "Choose an image file.",
    )
    expect(validateProfilePhoto({ type: "image/png", size: 6 * 1024 * 1024 })).toBe(
      "Choose an image smaller than 5 MB.",
    )
  })
})

describe("adminSelfProfile", () => {
  it("trims the guard profile and supplies the Flutter fallback name", () => {
    expect(
      adminSelfProfile({
        uid: "adm-1",
        email: "admin@staffrail.test",
        name: "  Alex Rivera ",
        photoUrl: "https://storage/photo.png",
        role: "admin",
      }),
    ).toEqual({
      uid: "adm-1",
      email: "admin@staffrail.test",
      name: "Alex Rivera",
      photoUrl: "https://storage/photo.png",
      role: "admin",
    })

    expect(
      adminSelfProfile({
        uid: "adm-1",
        email: null,
        name: null,
        role: "admin",
      }),
    ).toEqual({
      uid: "adm-1",
      email: "",
      name: "StaffRail Admin",
      photoUrl: null,
      role: "admin",
    })
  })
})
