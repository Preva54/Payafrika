import { test, expect } from "@playwright/test"

test.describe("Homepage", () => {
  test("renders all major sections", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("header")).toBeVisible()
    await expect(page.getByText("PayAfrika")).toBeVisible()
    await expect(page.getByRole("heading", { name: /empower/i })).toBeVisible()
    await expect(page.getByText(/trusted by/i)).toBeVisible()
    await expect(page.getByRole("heading", { name: /services/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /how it works/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /exchange rates/i })).toBeVisible()
    await expect(page.getByText(/testimonials/i)).toBeVisible()
    await expect(page.getByRole("heading", { name: /faq/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /contact/i })).toBeVisible()
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
    await page.goto("/")
    const toggle = page.getByLabel("Toggle theme")
    await expect(toggle).toBeVisible()
    await toggle.click()
  })

  test("page title and meta are correct", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/PayAfrika/)
  })
})
