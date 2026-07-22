import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("renders login form with all fields", async ({ page }) => {
      await page.goto("/auth/login")

      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible()
      await expect(page.getByLabel("Email")).toBeVisible()
      await expect(page.getByLabel("Password")).toBeVisible()
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible()
    })

    test("password visibility toggle works", async ({ page }) => {
      await page.goto("/auth/login")

      const passwordInput = page.getByLabel("Password")
      await expect(passwordInput).toHaveAttribute("type", "password")

      await page.getByRole("button", { name: /toggle password visibility/i }).click()
      await expect(passwordInput).toHaveAttribute("type", "text")
    })

    test("has remember me checkbox", async ({ page }) => {
      await page.goto("/auth/login")
      await expect(page.getByText("Remember me")).toBeVisible()
      await expect(page.getByRole("checkbox")).toBeVisible()
    })

    test("has link to forgot password", async ({ page }) => {
      await page.goto("/auth/login")
      const forgotLink = page.getByRole("link", { name: "Forgot password?" })
      await expect(forgotLink).toHaveAttribute("href", "/auth/forgot-password")
    })

    test("has link to register page", async ({ page }) => {
      await page.goto("/auth/login")
      const signUpLink = page.getByRole("link", { name: "Sign up" })
      await expect(signUpLink).toHaveAttribute("href", "/auth/register")
    })

    test("social login buttons are present", async ({ page }) => {
      await page.goto("/auth/login")
      await expect(page.getByRole("button", { name: "Google" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Apple" })).toBeVisible()
    })
  })

  test.describe("Register Page", () => {
    test("renders registration form", async ({ page }) => {
      await page.goto("/auth/register")

      await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
    })

    test("step progress indicator is visible", async ({ page }) => {
      await page.goto("/auth/register")

      const steps = page.locator("form > div").first().locator("> div")
      await expect(steps).toHaveCount(3)
    })

    test("has link to login page", async ({ page }) => {
      await page.goto("/auth/register")
      const signInLink = page.getByRole("link", { name: "Sign in" })
      await expect(signInLink).toHaveAttribute("href", "/auth/login")
    })
  })

  test.describe("Forgot Password Page", () => {
    test("renders forgot password form", async ({ page }) => {
      await page.goto("/auth/forgot-password")

      await expect(page.getByRole("heading", { name: /forgot/i })).toBeVisible()
      await expect(page.getByLabel("Email")).toBeVisible()
    })
  })

  test.describe("Verify Email Page", () => {
    test("renders verification form", async ({ page }) => {
      await page.goto("/auth/verify-email")

      await expect(page.getByText(/verify/i)).toBeVisible()
    })
  })
})
