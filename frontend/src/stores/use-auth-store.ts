import { create } from "zustand"
import { authApi, type LoginChallenge, type UserInfo } from "@/lib/api"

interface AuthState {
  user: UserInfo | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  pendingChallenge: LoginChallenge | null
  loginEmail: string | null

  login: (email: string, password: string) => Promise<boolean>
  verifyLogin: (code: string) => Promise<void>
  cancelChallenge: () => void
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
  pendingChallenge: null,
  loginEmail: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const response = await authApi.login({ email, password })

      if (response.requiresChallenge && response.challenge) {
        set({
          pendingChallenge: response.challenge,
          loginEmail: email,
          isLoading: false,
        })
        return false
      }

      if (response.auth) {
        localStorage.setItem("token", response.auth.token)
        set({
          token: response.auth.token,
          user: response.auth.user,
          isAuthenticated: true,
          pendingChallenge: null,
          loginEmail: null,
          isLoading: false,
        })
      }
      return true
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  verifyLogin: async (code: string) => {
    const challenge = get().pendingChallenge
    if (!challenge) throw new Error("No pending verification.")

    set({ isLoading: true })
    try {
      const response = await authApi.verifyLogin({ challengeId: challenge.challengeId, code })
      localStorage.setItem("token", response.token)
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        pendingChallenge: null,
        loginEmail: null,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  cancelChallenge: () => {
    set({ pendingChallenge: null, loginEmail: null, isLoading: false })
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
    set({ user: null, token: null, isAuthenticated: false, pendingChallenge: null })
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
