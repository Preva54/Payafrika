import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test.describe.configure({ retries: 2 })
  test.beforeEach(async ({ page }) => {
    // Set up API route interceptors BEFORE any navigation
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user-id",
          fullName: "Test User",
          email: "test@example.com",
          role: "customer",
          kycStatus: "verified",
        }),
      })
    })
    await page.route("**/api/wallet", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balance: 124850.0 }),
      })
    })
    await page.route("**/api/wallet/transactions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "1", type: "deposit", amount: 50000, description: "Loan Disbursement", status: "completed", createdAt: "2026-07-01T10:00:00Z" },
          { id: "2", type: "payment", amount: 15000, description: "Cross-Border Payment", status: "completed", createdAt: "2026-06-28T14:00:00Z" },
          { id: "3", type: "withdrawal", amount: 2500, description: "ATM Withdrawal", status: "completed", createdAt: "2026-06-25T09:00:00Z" },
        ]),
      })
    })
    await page.route("**/api/loans", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "1", amount: 100000, status: "active", monthlyPayment: 8500, createdAt: "2026-06-01T10:00:00Z" },
        ]),
      })
    })
  })

  test("renders welcome message and stats", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.setItem("token", "fake-test-token"))
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByText(/welcome back/i)).toBeVisible()
    await expect(page.getByText("Wallet Balance")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Total Spent" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Active Loans" })).toBeVisible()
    await expect(page.getByText("Next Payment")).toBeVisible()
  })

  test("displays wallet balance", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.setItem("token", "fake-test-token"))
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByText(/R\s*124/).first()).toBeVisible()
  })

  test("shows recent transactions section", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.setItem("token", "fake-test-token"))
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "Recent Transactions" })).toBeVisible()
    await expect(page.getByText("Loan Disbursement")).toBeVisible()
    await expect(page.getByText("Cross-Border Payment")).toBeVisible()
  })

  test("shows KYC status section", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.setItem("token", "fake-test-token"))
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "KYC Status" })).toBeVisible()
    await expect(page.getByText("Verification Complete")).toBeVisible()
  })

  test("transaction status badges are rendered", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.setItem("token", "fake-test-token"))
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    const badges = page.getByText("completed")
    const count = await badges.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe("Business Dashboard", () => {
  test("renders business page", async ({ page }) => {
    await page.goto("/business", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "Business Dashboard" })).toBeVisible()
  })
})

test.describe("Admin Panel", () => {
  test.describe.configure({ retries: 2 })
  test("renders admin dashboard", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => {
      localStorage.setItem("token", "fake-admin-token")
      sessionStorage.setItem("admin_user", JSON.stringify({ email: "admin@example.com", name: "Admin User", role: "superadmin" }))
    })
    await page.goto("/admin", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible()
  })

  test("sidebar navigation is present", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => {
      localStorage.setItem("token", "fake-admin-token")
      sessionStorage.setItem("admin_user", JSON.stringify({ email: "admin@example.com", name: "Admin User", role: "superadmin" }))
    })
    await page.goto("/admin", { waitUntil: "networkidle" })

    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible()
  })
})

test.describe("Blog", () => {
  test("renders blog listing", async ({ page }) => {
    await page.goto("/blog", { waitUntil: "networkidle" })

    await expect(page.getByText(/blog/i)).toBeVisible()
  })
})
