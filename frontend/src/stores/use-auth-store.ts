import { create } from "zustand"
import { authApi, type UserInfo } from "@/lib/api"

interface AuthState {
  user: UserInfo | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: {
    fullName: string
    email: string
    password: string
    phoneNumber?: string
    country?: string
    role?: string
  }) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: false,
  isAuthenticated: typeof window !== "undefined" ? !!localStorage.getItem("token") : false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const response = await authApi.login({ email, password })
      localStorage.setItem("token", response.token)
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      const response = await authApi.register(data)
      localStorage.setItem("token", response.token)
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchUser: async () => {
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      localStorage.removeItem("token")
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
