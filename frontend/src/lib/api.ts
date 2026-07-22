const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

interface ApiOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_URL}${endpoint}`, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "An error occurred" }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: "POST", body }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: "PUT", body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: "PATCH", body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
}

export interface AuthResponse {
  token: string
  refreshToken: string
  expiresAt: string
  user: UserInfo
}

export interface UserInfo {
  id: string
  fullName: string
  email: string
  role: string
  kycStatus: string | null
  avatarUrl: string | null
  isEmailVerified: boolean
}

export interface LoanResponse {
  id: string
  amount: number
  interestRate: number
  termMonths: number
  status: string
  purpose: string | null
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  createdAt: string
}

export interface WalletResponse {
  id: string
  userId: string
  currency: string
  balance: number
}

export const authApi = {
  register: (data: { fullName: string; email: string; password: string; phoneNumber?: string; country?: string; role?: string }) =>
    api.post<AuthResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data),
  me: () => api.get<UserInfo>("/auth/me"),
}

export const loansApi = {
  getAll: () => api.get<LoanResponse[]>("/loans"),
  getById: (id: string) => api.get<LoanResponse>(`/loans/${id}`),
  apply: (data: { amount: number; interestRate: number; termMonths: number; purpose?: string }) =>
    api.post<LoanResponse>("/loans", data),
}

export const walletApi = {
  get: () => api.get<WalletResponse>("/wallet"),
  deposit: (amount: number) => api.post<WalletResponse>("/wallet/deposit", amount),
  transactions: () => api.get<Transaction[]>("/wallet/transactions"),
}
