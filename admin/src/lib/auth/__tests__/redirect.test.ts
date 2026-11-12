import { describe, expect, it } from "vitest"

import { isSafeRedirectTarget, normalizeRedirectTarget, encodeRedirectTarget } from "@/lib/auth/redirect"

describe("isSafeRedirectTarget", () => {
  it("accepts plain same-origin paths", () => {
    expect(isSafeRedirectTarget("/dashboard")).toBe(true)
    expect(isSafeRedirectTarget("/dashboard/team/42")).toBe(true)
    expect(isSafeRedirectTarget("/a?x=1&y=2")).toBe(true)
    expect(isSafeRedirectTarget("/a#section")).toBe(true)
  })

  it("rejects absolute URLs and scheme-based attacks", () => {
    expect(isSafeRedirectTarget("https://evil.example")).toBe(false)
    expect(isSafeRedirectTarget("http://evil.example/path")).toBe(false)
    expect(isSafeRedirectTarget("javascript:alert(1)")).toBe(false)
    expect(isSafeRedirectTarget("data:text/html,evil")).toBe(false)
    expect(isSafeRedirectTarget("//evil.example")).toBe(false)
    expect(isSafeRedirectTarget("/\\evil.example")).toBe(false)
    expect(isSafeRedirectTarget("Https://evil.example")).toBe(false)
  })

  it("rejects protocol smuggling inside the path", () => {
    expect(isSafeRedirectTarget("/redirect?url=https://evil.example")).toBe(false)
    expect(isSafeRedirectTarget("/x/\njavascript:alert(1)")).toBe(false)
  })

  it("rejects control characters, empty and non-string input", () => {
    expect(isSafeRedirectTarget("/x\u0000y")).toBe(false)
    expect(isSafeRedirectTarget("")).toBe(false)
    expect(isSafeRedirectTarget(null)).toBe(false)
    expect(isSafeRedirectTarget(undefined)).toBe(false)
  })
})

describe("normalizeRedirectTarget", () => {
  it("keeps validated targets untouched", () => {
    expect(normalizeRedirectTarget("/dashboard/ops?tab=2")).toBe("/dashboard/ops?tab=2")
  })

  it("falls back to the default destination for anything unsafe", () => {
    expect(normalizeRedirectTarget("//evil.example")).toBe("/dashboard")
    expect(normalizeRedirectTarget("javascript:alert(1)")).toBe("/dashboard")
    expect(normalizeRedirectTarget(null)).toBe("/dashboard")
  })
})

describe("encodeRedirectTarget", () => {
  it("percent-encodes for ?redirect= parameters", () => {
    expect(encodeRedirectTarget("/dashboard?team=a b")).toBe(
      encodeURIComponent("/dashboard?team=a b"),
    )
  })
})
