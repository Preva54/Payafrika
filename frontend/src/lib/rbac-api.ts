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

export interface RoleDefinition {
  id: string
  name: string
  description: string
  department: string
  color: string
  icon: string
  priority: number
  isSystem: boolean
  isActive: boolean
  parentRoleId?: string
  restrictions: string
  permissions: { module: string; action: string }[]
  userCount: number
  createdAt: string
  updatedAt?: string
}

export interface Permission {
  id: string
  module: string
  action: string
  description: string
  groupName: string
  sortOrder: number
}

export interface UserAssignment {
  id: string
  userId: string
  roleId: string
  department: string
  region: string
  expiresAt?: string
  status: string
  notes: string
  createdAt: string
  user: { id: string; fullName: string; email: string; role: string }
  role: { id: string; name: string; color: string }
  assignedBy?: { id: string; fullName: string }
}

export interface Invitation {
  id: string
  email: string
  roleId: string
  department: string
  status: string
  expiresAt?: string
  createdAt: string
  acceptedAt?: string
}

export interface RoleDashboard {
  totalRoles: number
  customRoles: number
  activeAdmins: number
  pendingInvites: number
  systemRoles: number
  recentlyModified: number
  privileged: number
  inactiveUsers: number
}

export interface CreateRoleRequest {
  name: string
  description?: string
  department?: string
  color?: string
  icon?: string
  priority?: number
  parentRoleId?: string
  restrictions?: string
  permissions?: { module: string; action: string }[]
}

export interface AssignRoleRequest {
  userId: string
  roleId: string
  department?: string
  region?: string
  expiresAt?: string
  notes?: string
}

export interface CreateInvitationRequest {
  email: string
  roleId: string
  department?: string
}

export const rbacApi = {
  dashboard: () => request<RoleDashboard>("/api/admin/roles/dashboard"),

  getAll: () => request<RoleDefinition[]>("/api/admin/roles"),

  getById: (id: string) => request<RoleDefinition>(`/api/admin/roles/${id}`),

  create: (data: CreateRoleRequest) =>
    request<RoleDefinition>("/api/admin/roles", { method: "POST", body: JSON.stringify(data) }),

  update: (id: string, data: Partial<CreateRoleRequest>) =>
    request<RoleDefinition>(`/api/admin/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (id: string) =>
    request<void>(`/api/admin/roles/${id}`, { method: "DELETE" }),

  clone: (id: string) =>
    request<RoleDefinition>(`/api/admin/roles/${id}/clone`, { method: "POST" }),

  permissions: () => request<Permission[]>("/api/admin/roles/permissions"),

  seedPermissions: () =>
    request<{ count: number }>("/api/admin/roles/seed-permissions", { method: "POST" }),

  assign: (data: AssignRoleRequest) =>
    request<UserAssignment>("/api/admin/roles/assign", { method: "POST", body: JSON.stringify(data) }),

  removeAssignment: (assignmentId: string) =>
    request<void>(`/api/admin/roles/assign/${assignmentId}`, { method: "DELETE" }),

  assignments: (roleId?: string) =>
    request<UserAssignment[]>(`/api/admin/roles/assignments${roleId ? `?roleId=${roleId}` : ""}`),

  invite: (data: CreateInvitationRequest) =>
    request<Invitation>("/api/admin/roles/invite", { method: "POST", body: JSON.stringify(data) }),

  invitations: () => request<Invitation[]>("/api/admin/roles/invitations"),

  cancelInvitation: (id: string) =>
    request<void>(`/api/admin/roles/invitations/${id}`, { method: "DELETE" }),
}
