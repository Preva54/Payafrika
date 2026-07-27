import { test, expect } from "@playwright/test"

test.describe("Homepage", () => {
  test("renders all major sections", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })

    await expect(page.locator("header")).toBeVisible()
    await expect(page.getByRole("banner").getByText("PayAfrika")).toBeVisible()
    await expect(page.getByRole("heading", { name: /empower/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /trusted across/i })).toBeVisible()
    await expect(page.getByText("Our Services")).toBeVisible()
    await expect(page.getByText("How It Works")).toBeVisible()
    await expect(page.getByRole("heading", { name: /exchange rates/i })).toBeVisible()
    await expect(page.getByText("Testimonials")).toBeVisible()
    await expect(page.getByText("Got Questions?")).toBeVisible()
    await expect(page.getByText("Contact").first()).toBeVisible()
    await expect(page.locator("footer")).toBeVisible()
  })

  test("header navigation links are present", async ({ page }) => {
    await page.goto("/")

    const navLinks = ["Services", "Calculator", "Exchange", "Trade", "FAQ", "Contact"]
    for (const link of navLinks) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible()
    }
  })

  test("auth buttons link to correct pages", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/auth/login")
    await expect(page.getByRole("link", { name: "Get Started" })).toHaveAttribute("href", "/auth/register")
  })

  test("theme toggle works", async ({ page }) => {
    await page.goto("/auth/login", { waitUntil: "domcontentloaded" })
    await page.evaluate(() => localStorage.clear())
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const toggle = page.getByLabel("Toggle theme")
    await expect(toggle).toBeVisible({ timeout: 10000 })
    await toggle.click()
  })

  test("page title and meta are correct", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/PayAfrika/)
  })
})
