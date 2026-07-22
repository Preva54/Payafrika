import { create } from "zustand"

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@payafrika.com"
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "Admin@2026!"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

interface AdminUser {
  email: string
  name: string
  role: "superadmin"
}

interface AdminAuthState {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

async function getAdminJwt(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.token ?? null
  } catch {
    return null
  }
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: typeof window !== "undefined"
    ? JSON.parse(sessionStorage.getItem("admin_user") || "null")
    : null,
  isLoading: false,
  isAuthenticated: typeof window !== "undefined"
    ? !!sessionStorage.getItem("admin_user")
    : false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    await new Promise((r) => setTimeout(r, 800))
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      set({ isLoading: false })
      throw new Error("Invalid admin credentials")
    }
    const token = await getAdminJwt(email, password)
    if (token) {
      localStorage.setItem("token", token)
    }
    const user: AdminUser = { email, name: "Owner", role: "superadmin" }
    sessionStorage.setItem("admin_user", JSON.stringify(user))
    set({ user, isAuthenticated: true, isLoading: false })
  },

  fetchUser: async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      const stored = sessionStorage.getItem("admin_user")
      if (stored) {
        set({ user: JSON.parse(stored), isLoading: false })
      }
      return
    }
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const user: AdminUser = { email: data.email, name: data.fullName, role: "superadmin" }
        sessionStorage.setItem("admin_user", JSON.stringify(user))
        set({ user, isLoading: false })
      } else {
        const stored = sessionStorage.getItem("admin_user")
        if (stored) {
          set({ user: JSON.parse(stored), isLoading: false })
        }
      }
    } catch {
      const stored = sessionStorage.getItem("admin_user")
      if (stored) {
        set({ user: JSON.parse(stored), isLoading: false })
      }
    }
  },

  logout: () => {
    localStorage.removeItem("token")
    sessionStorage.removeItem("admin_user")
    set({ user: null, isAuthenticated: false })
  },
}))
