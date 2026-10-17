import { describe, expect, it } from "vitest"

import { NextRequest } from "next/server"

import { proxy } from "@/proxy"
import { SESSION_COOKIE } from "@/lib/auth/constants"

/** Builds a NextRequest with an optional (possibly stale) session cookie. */
function makeRequest(path: string, withSession = false): NextRequest {
  const headers = new Headers()
  if (withSession) {
    headers.set("cookie", `${SESSION_COOKIE}=stale-or-fresh-value`)
  }
  return new NextRequest(`https://admin.test${path}`, { headers })
}

describe("proxy — protected routes", () => {
  it("bounces cookie-less visitors to /login, preserving the safe target", () => {
    const response = proxy(makeRequest("/dashboard/directory/emp-1?tab=docs"))

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location") ?? "", "https://admin.test")
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("redirect")).toBe("/dashboard/directory/emp-1?tab=docs")
  })

  it("falls back to /dashboard for unsafe redirect targets", () => {
    const response = proxy(makeRequest("/dashboard"))

    expect(response.status).toBe(307)
    const location = new URL(response.headers.get("location") ?? "", "https://admin.test")
    expect(location.searchParams.get("redirect")).toBe("/dashboard")
  })

  it("lets cookie-bearing visitors through to protected pages", () => {
    const response = proxy(makeRequest("/dashboard/directory", true))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })
})

describe("proxy — /login redirect-loop fix", () => {
  it("sends signed-in visitors from /login to /dashboard when no state is present", () => {
    const response = proxy(makeRequest("/login", true))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location") ?? "", "https://admin.test").pathname).toBe(
      "/dashboard",
    )
  })

  it("does NOT bounce a just-expired session back to the dashboard (loop breaker)", () => {
    // Guarded page redirected here with ?state=expired after finding the
    // session invalid; the old proxy redirected straight back → infinite loop.
    const response = proxy(makeRequest("/login?state=expired&redirect=%2Fdashboard", true))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
  })

  it("clears the stale session cookie so a fresh login can succeed", () => {
    const response = proxy(makeRequest("/login?state=expired&redirect=%2Fdashboard", true))

    const setCookie = response.headers.getSetCookie().join(", ")
    expect(setCookie).toContain(SESSION_COOKIE)
    // Next's cookie.delete emits an expired-epoch Set-Cookie.
    const lowered = setCookie.toLowerCase()
    expect(lowered.includes("max-age=0") || lowered.includes("expires=thu, 01 jan 1970")).toBe(true)
  })

  it("login without a session cookie stays untouched", () => {
    const response = proxy(makeRequest("/login"))

    expect(response.status).toBe(200)
    expect(response.headers.getSetCookie()).toHaveLength(0)
  })
})

describe("proxy — /login with state tamper", () => {
  it("only ?state=expired breaks the loop; other values keep normal routing", () => {
    const response = proxy(makeRequest("/login?state=removed", true))

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get("location") ?? "", "https://admin.test").pathname).toBe(
      "/dashboard",
    )
  })
})
