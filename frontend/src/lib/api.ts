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

export interface Transaction {
  id: string
  userId: string
  type: string
  amount: number
  currency: string
  status: string
  description: string | null
  reference: string | null
  createdAt: string
  completedAt: string | null
}

export const walletApi = {
  get: () => api.get<WalletResponse>("/wallet"),
  deposit: (amount: number) => api.post<WalletResponse>("/wallet/deposit", amount),
  transactions: () => api.get<Transaction[]>("/wallet/transactions"),
}

export interface AdminDashboard {
  totalUsers: number
  totalLoans: number
  pendingLoans: number
  totalTransactions: number
  totalRevenue: number
}

export interface AdminUser {
  id: string
  fullName: string
  email: string
  role: string
  kycStatus: string
  createdAt: string
}

export interface AdminLoan {
  id: string
  userName: string
  userEmail: string
  amount: number
  status: string
  createdAt: string
}

export interface AdminPayment {
  id: string
  userName: string
  userEmail: string
  amount: number
  type: string
  status: string
  description: string | null
  createdAt: string
}

export interface AdminKyc {
  id: string
  fullName: string
  email: string
  kycStatus: string | null
  country: string | null
  updatedAt: string | null
}

export interface AdminRoleGroup {
  role: string
  count: number
  users: { id: string; fullName: string; email: string }[]
}

export interface AdminReports {
  totalUsers: number
  totalLoans: number
  activeLoans: number
  totalDeposits: number
  totalWithdrawals: number
  loanVolume: number
}

export interface AdminAffiliate {
  id: string
  fullName: string
  email: string
  country: string | null
  createdAt: string
}

export const adminApi = {
  dashboard: () => api.get<AdminDashboard>("/admin/dashboard"),
  users: () => api.get<AdminUser[]>("/admin/users"),
  loans: () => api.get<AdminLoan[]>("/admin/loans"),
  payments: () => api.get<AdminPayment[]>("/admin/payments"),
  kyc: () => api.get<AdminKyc[]>("/admin/kyc"),
  roles: () => api.get<AdminRoleGroup[]>("/admin/roles"),
  reports: () => api.get<AdminReports>("/admin/reports"),
  affiliates: () => api.get<AdminAffiliate[]>("/admin/affiliates"),
  auditLogs: () => api.get<object[]>("/admin/audit-logs"),
  tickets: () => api.get<object[]>("/admin/tickets"),
  cms: () => api.get<{ pages: object[]; blogPosts: object[] }>("/admin/cms"),
}

export interface PaymentRequestPayload {
  amount: number
  currency: string
  provider: string
  reference?: string
  description?: string
  returnUrl?: string
  callbackUrl?: string
}

export interface PaymentResult {
  success: boolean
  transactionId: string
  redirectUrl?: string
  status?: string
  errorMessage?: string
}

export interface Beneficiary {
  id: string
  name: string
  bankName?: string
  accountNumber?: string
  country?: string
  currency: string
  isVerified: boolean
  isFavorite: boolean
  createdAt: string
}

export interface SchedulePayment {
  id: string
  beneficiaryId?: string
  beneficiaryName: string
  amount: number
  currency: string
  frequency: string
  nextDate: string
  endDate?: string
  status: string
  description?: string
  createdAt: string
}

export interface ExchangeRate {
  code: string
  buy: number
  sell: number
  name: string
  flag: string
  changePercent: number
}

export const paymentsApi = {
  initiate: (data: PaymentRequestPayload) => api.post<PaymentResult>("/payments/initiate", data),
  verify: (provider: string, transactionId: string) => api.get<{ isValid: boolean; transactionId: string; amount: number; currency: string; status: string; customerEmail?: string }>(`/payments/verify/${provider}/${transactionId}`),
}

export const beneficiariesApi = {
  getAll: () => api.get<Beneficiary[]>("/beneficiaries"),
  get: (id: string) => api.get<Beneficiary>(`/beneficiaries/${id}`),
  create: (data: Partial<Beneficiary>) => api.post<Beneficiary>("/beneficiaries", data),
  update: (id: string, data: Partial<Beneficiary>) => api.put<Beneficiary>(`/beneficiaries/${id}`, data),
  delete: (id: string) => api.delete(`/beneficiaries/${id}`),
}

export const scheduledPaymentsApi = {
  getAll: () => api.get<SchedulePayment[]>("/scheduledpayments"),
  create: (data: Partial<SchedulePayment>) => api.post<SchedulePayment>("/scheduledpayments", data),
  pause: (id: string) => api.put<SchedulePayment>(`/scheduledpayments/${id}/pause`),
  resume: (id: string) => api.put<SchedulePayment>(`/scheduledpayments/${id}/resume`),
  delete: (id: string) => api.delete(`/scheduledpayments/${id}`),
}

export const exchangeRatesApi = {
  get: () => api.get<ExchangeRate[]>("/exchangerates"),
}

export const dashboardApi = {
  loans: () => api.get<LoanResponse[]>("/loans"),
  wallet: () => api.get<WalletResponse>("/wallet"),
  transactions: () => api.get<Transaction[]>("/wallet/transactions"),
  user: () => api.get<UserInfo>("/auth/me"),
}
