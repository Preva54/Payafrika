import { api } from "./api"

export interface AdminSettingsDashboard {
  platformName: string
  currentVersion: string
  activeIntegrationCount: number
  securityScore: boolean
  backupConfigured: boolean
  apiHealthy: boolean
  maintenanceMode: boolean
  licenseStatus: string
}

export interface PlatformSettingsField {
  key: string
  label: string
  description: string
  type: string
  value: string
  defaultValue?: string
  isEncrypted: boolean
  options?: string[]
  placeholder?: string
  validation?: string
}

export interface PlatformSettingsCategory {
  id: string
  label: string
  icon: string
  description: string
  fields: PlatformSettingsField[]
}

export interface SettingChangeLogEntry {
  id: string
  category: string
  key: string
  oldValue: string
  newValue: string
  changedByName: string
  changedAt: string
}

export const adminSettingsApi = {
  dashboard: () => api.get<AdminSettingsDashboard>("/admin/settings/dashboard"),

  getAll: () => api.get<PlatformSettingsCategory[]>("/admin/settings"),

  getCategory: (category: string) =>
    api.get<PlatformSettingsCategory>(`/admin/settings/${category}`),

  updateCategory: (category: string, fields: { key: string; value: string; type: string }[]) =>
    api.put(`/admin/settings/${category}`, fields),

  restoreDefaults: (category: string) =>
    api.post(`/admin/settings/restore-defaults`, category),

  changelog: (category?: string, page = 1, limit = 50) => {
    const p = new URLSearchParams()
    if (category) p.set("category", category)
    p.set("page", page.toString())
    p.set("limit", limit.toString())
    return api.get<{ logs: SettingChangeLogEntry[]; total: number }>(`/admin/settings/changelog?${p}`)
  },

  exportConfig: () =>
    api.getBlob("/admin/settings/export"),

  importConfig: (data: string) =>
    api.post("/admin/settings/import", data),
}
