// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { PrivacyPolicyView } from "@/app/dashboard/profile/privacy/privacy-policy-view"

afterEach(() => {
  cleanup()
})

describe("PrivacyPolicyView", () => {
  it("renders the five Flutter privacy sections verbatim", () => {
    render(<PrivacyPolicyView />)

    expect(screen.getByRole("heading", { name: "Privacy & Security" })).toBeInTheDocument()
    expect(screen.getByText("1. Information We Collect")).toBeInTheDocument()
    expect(screen.getByText("2. How We Use Your Data")).toBeInTheDocument()
    expect(screen.getByText("3. Data Retention & Deletion")).toBeInTheDocument()
    expect(screen.getByText("4. Security Measures")).toBeInTheDocument()
    expect(screen.getByText("5. Your Rights")).toBeInTheDocument()
    expect(screen.getByText(/We do not sell your personal data/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute(
      "href",
      "/dashboard/profile",
    )
  })
})
