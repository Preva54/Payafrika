import { api } from "./api"

export interface UserListItem {
  id: string
  fullName: string
  email: string
  phoneNumber?: string
  role: string
  kycStatus?: string
  country?: string
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt?: string
  walletBalance: number
}

export interface UserListResponse {
  users: UserListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserDetail {
  id: string
  fullName: string
  email: string
  phoneNumber?: string
  role: string
  kycStatus?: string
  country?: string
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  avatarUrl?: string
  createdAt: string
  updatedAt?: string
  wallet?: { balance: number; currency: string; createdAt: string }
  walletBalances?: { currency: string; balance: number; reservedBalance: number }[]
  roles?: { name: string; color: string; icon: string; description: string; department?: string; region?: string; expiresAt?: string; createdAt: string }[]
  business?: {
    businessName?: string; registrationNumber?: string; vatNumber?: string
    industry?: string; companyAddress?: string; website?: string
    settlementPreference?: string; bankAccountDetails?: string
  }
  stats?: { deviceCount: number; txCount: number; ticketCount: number }
}

export interface DashboardData {
  total: number
  active: number
  newToday: number
  suspended: number
  pendingKyc: number
  verified: number
  deleted: number
  dailyReg: { date: string; count: number }[]
  roleDist: { label: string; value: number }[]
}

export interface UserTransaction {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  description?: string
  reference?: string
  createdAt: string
}

export interface UserDevice {
  id: string
  deviceName: string
  deviceType: string
  browser?: string
  os?: string
  ipAddress?: string
  location?: string
  isTrusted: boolean
  isCurrent: boolean
  lastActiveAt: string
}

export interface UserActivity {
  id: string
  action: string
  category: string
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface AnalyticsData {
  dau: number
  wau: number
  mau: number
  total: number
  monthlyNew: { date: string; count: number }[]
  countryDist: { label: string; value: number }[]
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export const adminUsersApi = {
  dashboard: () => api.get<DashboardData>("/admin/users/dashboard"),

  list: (params?: { search?: string; role?: string; status?: string; kycStatus?: string; country?: string; sort?: string; page?: number; limit?: number }) =>
    api.get<UserListResponse>(`/admin/users${buildQuery(params || {})}`),

  get: (id: string) => api.get<UserDetail>(`/admin/users/${id}`),

  update: (id: string, data: { fullName?: string; phoneNumber?: string; country?: string }) =>
    api.put(`/admin/users/${id}`, data),

  suspend: (id: string) => api.post(`/admin/users/${id}/suspend`, {}),
  reactivate: (id: string, role?: string) => api.post(`/admin/users/${id}/reactivate`, { newRole: role }),
  delete: (id: string) => api.delete(`/admin/users/${id}`),
  restore: (id: string) => api.post(`/admin/users/${id}/restore`, {}),
  resetPassword: (id: string) => api.post<{ temporaryPassword: string }>(`/admin/users/${id}/reset-password`, {}),
  verifyEmail: (id: string) => api.post(`/admin/users/${id}/verify-email`, {}),
  lock: (id: string) => api.post(`/admin/users/${id}/lock`, {}),
  unlock: (id: string) => api.post(`/admin/users/${id}/unlock`, {}),

  transactions: (id: string, page = 1, limit = 20) =>
    api.get<{ transactions: UserTransaction[]; total: number }>(`/admin/users/${id}/transactions?page=${page}&limit=${limit}`),

  devices: (id: string) =>
    api.get<UserDevice[]>(`/admin/users/${id}/devices`),

  removeDevice: (id: string, deviceId: string) =>
    api.delete(`/admin/users/${id}/devices/${deviceId}`),

  forceLogout: (id: string) =>
    api.post(`/admin/users/${id}/logout-all`, {}),

  activity: (id: string, page = 1, limit = 50) =>
    api.get<{ logs: UserActivity[]; total: number }>(`/admin/users/${id}/activity?page=${page}&limit=${limit}`),

  roles: (id: string) =>
    api.get<{ assignments: unknown[]; availableRoles: { id: string; name: string; color: string }[] }>(`/admin/users/${id}/roles`),

  assignRole: (id: string, data: { roleId: string; department?: string; region?: string; notes?: string }) =>
    api.post(`/admin/users/${id}/roles`, data),

  removeRole: (id: string, assignmentId: string) =>
    api.delete(`/admin/users/${id}/roles/${assignmentId}`),

  analytics: () => api.get<AnalyticsData>("/admin/users/analytics"),

  bulk: (userIds: string[], action: string) =>
    api.post("/admin/users/bulk", { userIds, action }),

  invite: (data: { email: string; fullName?: string; role?: string; country?: string; phoneNumber?: string }) =>
    api.post<{ id: string; tempPassword: string }>("/admin/users/invite", data),
}
