import { describe, expect, it } from "vitest"

import { assertSameOrigin, OriginError } from "@/lib/auth/origin"

describe("assertSameOrigin (session creation CSRF/origin gate)", () => {
  const HOST = "admin.staffrail.test"

  it("accepts a same-site Origin header", () => {
    expect(() =>
      assertSameOrigin({
        originHeader: `https://${HOST}`,
        refererHeader: null,
        host: HOST,
      }),
    ).not.toThrow()
  })

  it("accepts a same-host Referer when Origin is absent", () => {
    expect(() =>
      assertSameOrigin({
        originHeader: null,
        refererHeader: `https://${HOST}/login`,
        host: HOST,
      }),
    ).not.toThrow()
  })

  it("rejects cross-site origins and hosts", () => {
    expect(() =>
      assertSameOrigin({
        originHeader: "https://evil.example",
        refererHeader: null,
        host: HOST,
      }),
    ).toThrow(OriginError)

    expect(() =>
      assertSameOrigin({
        originHeader: null,
        refererHeader: "https://evil.example/login",
        host: HOST,
      }),
    ).toThrow(OriginError)
  })

  it("rejects requests with neither Origin nor Referer (cross-site fetch)", () => {
    expect(() =>
      assertSameOrigin({ originHeader: null, refererHeader: null, host: HOST }),
    ).toThrow(OriginError)
  })

  it("is case- and default-port-insensitive", () => {
    expect(() =>
      assertSameOrigin({
        originHeader: `https://ADMIN.STAFFRAIL.TEST`,
        refererHeader: null,
        host: HOST,
      }),
    ).not.toThrow()
  })

  it("enforces https sources in production mode", () => {
    expect(() =>
      assertSameOrigin({
        originHeader: "http://admin.staffrail.test",
        refererHeader: null,
        host: HOST,
        requireHttps: true,
      }),
    ).toThrow(OriginError)
  })

  it("rejects the opaque origin 'null' (sandboxed iframes)", () => {
    expect(() =>
      assertSameOrigin({ originHeader: "null", refererHeader: null, host: HOST }),
    ).toThrow(OriginError)
  })
})
