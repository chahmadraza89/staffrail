import { describe, expect, it } from "vitest"

import { createCsrfCookieValue, verifyCsrfPair } from "@/lib/auth/csrf"

const SECRET = "unit-test-csrf-secret-0000000000"

describe("verifyCsrfPair (double-submit cookie + HMAC signature)", () => {
  it("validates a freshly minted pair (header echoes the cookie token)", () => {
    const cookieValue = createCsrfCookieValue(SECRET)
    const token = cookieValue.slice(0, cookieValue.lastIndexOf("."))

    expect(verifyCsrfPair({ headerToken: token, cookieValue, secret: SECRET })).toBe(true)
  })

  it("rejects a fixed signature that does not sign the cookie token", () => {
    const cookieValue = createCsrfCookieValue(SECRET)
    const token = cookieValue.slice(0, cookieValue.lastIndexOf("."))
    const fakeSignature = "a".repeat(64)

    expect(
      verifyCsrfPair({
        headerToken: token,
        cookieValue: `evil-cookie-token.${fakeSignature}`,
        secret: SECRET,
      }),
    ).toBe(false)
  })

  it("rejects tampering with the signature part", () => {
    const cookieValue = createCsrfCookieValue(SECRET)
    const [token, sig] = cookieValue.split(".")
    const tampered = `${token}.${sig.slice(0, -2)}ab`

    expect(verifyCsrfPair({ headerToken: token, cookieValue: tampered, secret: SECRET })).toBe(false)
  })

  it("rejects header/cookie mismatch and missing parts", () => {
    const cookieValue = createCsrfCookieValue(SECRET)
    const token = cookieValue.slice(0, cookieValue.lastIndexOf("."))

    expect(verifyCsrfPair({ headerToken: "deadc0de", cookieValue, secret: SECRET })).toBe(false)
    expect(verifyCsrfPair({ headerToken: token, cookieValue: null, secret: SECRET })).toBe(false)
    expect(verifyCsrfPair({ headerToken: null, cookieValue, secret: SECRET })).toBe(false)
    expect(verifyCsrfPair({ headerToken: token, cookieValue: "no-dot-here", secret: SECRET })).toBe(false)
  })

  it("rejects values signed with a different secret", () => {
    const otherSecret = `${SECRET}-different`
    const cookieValue = createCsrfCookieValue(otherSecret)
    const token = cookieValue.slice(0, cookieValue.lastIndexOf("."))

    expect(verifyCsrfPair({ headerToken: token, cookieValue, secret: SECRET })).toBe(false)
  })
})
