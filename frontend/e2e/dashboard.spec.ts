import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test("renders welcome message and stats", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByText(/welcome back/i)).toBeVisible()
    await expect(page.getByText("Wallet Balance")).toBeVisible()
    await expect(page.getByText("Total Spent")).toBeVisible()
    await expect(page.getByText("Active Loans")).toBeVisible()
    await expect(page.getByText("Next Payment")).toBeVisible()
  })

  test("displays wallet balance", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByText("R 124,850.00")).toBeVisible()
  })

  test("shows recent transactions section", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByRole("heading", { name: "Recent Transactions" })).toBeVisible()
    await expect(page.getByText("Loan Disbursement")).toBeVisible()
    await expect(page.getByText("Cross-Border Payment")).toBeVisible()
  })

  test("shows KYC status section", async ({ page }) => {
    await page.goto("/dashboard")

    await expect(page.getByRole("heading", { name: "KYC Status" })).toBeVisible()
    await expect(page.getByText("Verification Complete")).toBeVisible()
    await expect(page.getByText("Government ID")).toBeVisible()
    await expect(page.getByText("Proof of Address")).toBeVisible()
  })

  test("transaction status badges are rendered", async ({ page }) => {
    await page.goto("/dashboard")

    const badges = page.getByText("completed")
    const count = await badges.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe("Business Dashboard", () => {
  test("renders business stats", async ({ page }) => {
    await page.goto("/business")

    await expect(page.getByText(/business/i)).toBeVisible()
  })
})

test.describe("Admin Panel", () => {
  test("renders admin dashboard", async ({ page }) => {
    await page.goto("/admin")

    await expect(page.getByText(/admin/i)).toBeVisible()
  })

  test("sidebar navigation is present", async ({ page }) => {
    await page.goto("/admin")

    await expect(page.getByText("Dashboard")).toBeVisible()
  })
})

test.describe("Blog", () => {
  test("renders blog listing", async ({ page }) => {
    await page.goto("/blog")

    await expect(page.getByText(/blog/i)).toBeVisible()
  })
})
