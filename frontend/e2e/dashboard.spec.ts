import { test, expect } from "@playwright/test"

const CURRENCY_WALLETS = [
  { currency: "ZAR", flag: "\uD83C\uDDFF\uD83C\uDDE6", name: "South African Rand", balance: 124850, availableBalance: 124850, reservedBalance: 0, zarValue: 124850, changePercent: 0.5, miniGraph: [100, 102, 101, 103, 105, 104, 106] },
  { currency: "USD", flag: "\uD83C\uDDFA\uD83C\uDDF8", name: "US Dollar", balance: 540, availableBalance: 540, reservedBalance: 0, zarValue: 9720, changePercent: 0.2, miniGraph: [100, 99, 101, 102, 100, 101, 102] },
]

test.describe("Dashboard", () => {
  test.describe.configure({ retries: 2 })
  test.beforeEach(async ({ page }) => {
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
    await page.route("**/api/wallet/overview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalBalance: 124850,
          availableBalance: 124850,
          pendingBalance: 2000,
          reservedBalance: 1550,
          portfolioValue: 124850,
          supportedCurrencies: 2,
          monthlyCashFlow: 5000,
          monthlyIncome: 25000,
          monthlySpending: 20000,
        }),
      })
    })
    await page.route("**/api/wallet/balances", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(CURRENCY_WALLETS),
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
    await page.route("**/api/wallet/exchange-rates", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { from: "ZAR", to: "USD", rate: 18.5, spread: 0.21, lastUpdated: new Date().toISOString() },
        ]),
      })
    })
    await page.route("**/api/wallet/notifications", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem("token", "fake-test-token")
    })
  })

  test("renders welcome message and stats", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible()
    await expect(page.getByText("Total Portfolio")).toBeVisible()
    await expect(page.getByText("Available Balance")).toBeVisible()
    await expect(page.getByText("Pending Balance")).toBeVisible()
    await expect(page.getByText("Reserved Balance")).toBeVisible()
  })

  test("displays wallet balance", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByText(/124[^\d]*850[^\d]*\d/).first()).toBeVisible()
  })

  test("shows recent transactions section", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "Recent Transactions" })).toBeVisible()
    await expect(page.getByText("Deposit").first()).toBeVisible()
    await expect(page.getByText("Payment").first()).toBeVisible()
    await expect(page.getByText("Withdrawal")).toBeVisible()
  })

  test("shows quick actions", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "Quick Actions" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Deposit" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Withdraw" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Exchange" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Transfer" })).toBeVisible()
  })

  test("transaction status badges are rendered", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" })

    await expect(page.getByText("completed")).not.toHaveCount(0)
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
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/admin/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalRevenue: 500000, totalUsers: 1500, totalLoans: 300, pendingLoans: 25,
          totalTransactions: 12000, activeUsers: 800,
        }),
      })
    })
    await page.addInitScript(() => {
      localStorage.setItem("token", "fake-admin-token")
      sessionStorage.setItem("admin_user", JSON.stringify({ email: "admin@example.com", name: "Admin User", role: "superadmin" }))
    })
  })

  test("renders admin dashboard", async ({ page }) => {
    await page.goto("/admin", { waitUntil: "networkidle" })

    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible()
  })

  test("sidebar navigation is present", async ({ page }) => {
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
