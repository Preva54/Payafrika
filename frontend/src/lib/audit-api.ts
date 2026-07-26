const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://pafrikav2-api.ambitiousocean-b7255ba5.northeurope.azurecontainerapps.io/api"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const config: RequestInit = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  }
  const response = await fetch(`${API_URL}${endpoint}`, config)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "An error occurred" }))
    throw new Error(error.error || error.message || `HTTP ${response.status}`)
  }
  return response.json()
}

export interface AuditLog {
  id: string
  userId?: string
  userName: string
  userRole: string
  email: string
  action: string
  module: string
  resource: string
  resourceId: string
  previousValue: string
  newValue: string
  metadata: string
  ipAddress: string
  userAgent: string
  browser: string
  operatingSystem: string
  deviceType: string
  sessionId: string
  location: string
  country: string
  city: string
  endpoint: string
  httpMethod: string
  httpStatus?: number
  result: string
  severity: string
  responseTimeMs?: number
  department: string
  isSecurityAlert: boolean
  isAcknowledged: boolean
  acknowledgedById?: string
  acknowledgedAt?: string
  correlationId?: string
  createdAt: string
}

export interface AuditDashboard {
  totalToday: number
  criticalToday: number
  failedLogins: number
  adminActions: number
  apiRequests: number
  fraudAlerts: number
  kycReviews: number
  systemErrors: number
  errorsByHour: { hour: number; count: number }[]
  topUsers: { userId: string; userName: string; email: string; count: number }[]
  actionsByModule: { module: string; count: number }[]
  severityDistribution: { severity: string; count: number }[]
}

export interface AuditLogResponse {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  severityCounts: Record<string, number>
}

export const auditApi = {
  dashboard: () => request<AuditDashboard>("/audit-logs/dashboard"),

  list: (params?: {
    page?: number
    pageSize?: number
    search?: string
    userId?: string
    action?: string
    module?: string
    severity?: string
    result?: string
    department?: string
    resource?: string
    ipAddress?: string
    country?: string
    deviceType?: string
    browser?: string
    os?: string
    from?: string
    to?: string
    isSecurityAlert?: boolean
    sortBy?: string
    sortDir?: string
  }) => {
    const qs = params ? "?" + Object.entries(params)
      .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&") : ""
    return request<AuditLogResponse>(`/audit-logs${qs}`)
  },

  getById: (id: string) => request<AuditLog>(`/audit-logs/${id}`),

  export: async (format: "csv" | "json", params?: { from?: string; to?: string; module?: string; severity?: string }) => {
    const qs = params ? "?" + Object.entries(params)
      .filter((entry) => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&") : ""
    const token = getToken()
    const response = await fetch(`${API_URL}/audit-logs/export?format=${format}${qs}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!response.ok) throw new Error("Export failed")
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  },

  securityAlerts: (params?: { page?: number; pageSize?: number; acknowledged?: boolean }) => {
    const qs = params ? "?" + Object.entries(params)
      .filter((entry) => entry[1] !== undefined && entry[1] !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&") : ""
    return request<{ items: AuditLog[]; total: number; page: number; pageSize: number }>(`/audit-logs/security-alerts${qs}`)
  },

  acknowledgeAlert: (id: string) => request<AuditLog>(`/audit-logs/security-alerts/${id}/acknowledge`, { method: "PUT" }),
}
