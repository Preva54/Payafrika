import { api } from "./api"

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  country: string
  flagEmoji: string
  decimalPlaces: number
  isActive: boolean
  isDefault: boolean
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt?: string
}

export interface ExchangeRate {
  id: string
  baseCurrency: string
  quoteCurrency: string
  buyRate: number
  sellRate: number
  midMarketRate: number
  spread: number
  providerId?: string
  source: string
  lockedUntil?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  provider?: ExchangeRateProvider
}

export interface ExchangeRateProvider {
  id: string
  name: string
  apiEndpoint: string
  apiKeyEncrypted?: string
  priority: number
  isActive: boolean
  isPrimary: boolean
  isFallback: boolean
  healthStatus: string
  lastHealthCheck?: string
  configJson?: string
  createdAt: string
  updatedAt?: string
}

export interface CurrencyPair {
  id: string
  baseCurrency: string
  quoteCurrency: string
  isEnabled: boolean
  preferredProviderId?: string
  minBuySpread: number
  maxBuySpread: number
  minSellSpread: number
  maxSellSpread: number
  dailyBuyLimit: number
  dailySellLimit: number
  buyFee: number
  sellFee: number
  feeType: string
  sortOrder: number
  createdAt: string
  updatedAt?: string
}

export interface FxMargin {
  id: string
  name: string
  type: string
  entityId?: string
  marginType: string
  value: number
  minValue?: number
  maxValue?: number
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt?: string
}

export interface ConversionRule {
  id: string
  name: string
  ruleType: string
  roundingRule: string
  decimalPrecision: number
  minAmount?: number
  maxAmount?: number
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt?: string
}

export interface SettlementCurrency {
  id: string
  currency: string
  isDefaultSettlement: boolean
  autoConversion: boolean
  settlementFrequency: string
  marginPercent: number
  feePercent: number
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface RegionalCurrencyRule {
  id: string
  country: string
  defaultCurrency: string
  supportedCurrenciesJson: string
  allowedPairsJson: string
  restrictionsJson: string
  localPaymentMethodsJson: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface ExchangeAlert {
  id: string
  alertType: string
  channel: string
  threshold: number
  isEnabled: boolean
  createdAt: string
  updatedAt?: string
}

export interface FxAuditLog {
  id: string
  userId?: string
  userName: string
  action: string
  entityType: string
  entityId?: string
  previousValueJson?: string
  newValueJson?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface FxDashboard {
  supportedCurrencies: number
  activeRates: number
  lastSync?: string
  todayFxVolume: number
  averageMargin: number
  failedUpdates: number
  currencyPairs: number
  activeProviders: number
  degradedProviders: number
  liveRates: LiveRate[]
}

export interface LiveRate {
  pair: string
  rate: number
  change: number
  direction: string
  updatedAt: string
}

export interface FxReport {
  exchangeVolume: number
  fxRevenue: number
  averageMargin: number
  conversionSuccessRate: number
  totalConversions: number
  failedConversions: number
  currencyUsage: { currency: string; count: number; volume: number }[]
  topPairs: { pair: string; volume: number; count: number }[]
}

export interface FxAnalytics {
  mostUsedCurrency: string
  mostActivePair: string
  dailyFxVolume: number
  weeklyFxVolume: number
  monthlyFxVolume: number
  fxProfit: number
  conversionRate: number
  failedConversions: number
  volumeTrend: { date: string; volume: number }[]
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `?${s}` : ""
}

export interface CustomerExchange {
  id: string
  reference: string
  fromCurrency: string
  toCurrency: string
  amount: number
  convertedAmount: number
  rate: number
  fee: number
  fxMargin: number
  status: string
  sourceBalanceBefore: number
  sourceBalanceAfter: number
  destBalanceBefore: number
  destBalanceAfter: number
  notes: string | null
  createdAt: string
  completedAt: string | null
  user?: { id: string; fullName: string; email: string }
}

export interface AdminExchangeStats {
  todaysExchanges: number
  totalFxVolume: number
  fxRevenue: number
  averageExchangeSize: number
  failedExchanges: number
  mostTradedPair: string
}

export const exchangeApi = {
  currencies: {
    getAll: () => api.get<Currency[]>("/admin/currencies"),
    get: (id: string) => api.get<Currency>(`/admin/currencies/${id}`),
    create: (data: Partial<Currency>) => api.post<Currency>("/admin/currencies", data),
    update: (id: string, data: Partial<Currency>) => api.put<Currency>(`/admin/currencies/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/currencies/${id}/toggle`, {}),
    setDefault: (id: string) => api.patch(`/admin/currencies/${id}/default`, {}),
    delete: (id: string) => api.delete(`/admin/currencies/${id}`),
  },
  rates: {
    getAll: () => api.get<ExchangeRate[]>("/admin/exchange-rates"),
    get: (id: string) => api.get<ExchangeRate>(`/admin/exchange-rates/${id}`),
    create: (data: Partial<ExchangeRate>) => api.post<ExchangeRate>("/admin/exchange-rates", data),
    update: (id: string, data: Partial<ExchangeRate>) => api.put<ExchangeRate>(`/admin/exchange-rates/${id}`, data),
    lock: (id: string, until?: string) => api.patch(`/admin/exchange-rates/${id}/lock${until ? `?until=${until}` : ""}`, {}),
    unlock: (id: string) => api.patch(`/admin/exchange-rates/${id}/unlock`, {}),
    delete: (id: string) => api.delete(`/admin/exchange-rates/${id}`),
    sync: (providerId: string) => api.post(`/admin/exchange-rates/sync/${providerId}`, {}),
  },
  providers: {
    getAll: () => api.get<ExchangeRateProvider[]>("/admin/exchange-providers"),
    get: (id: string) => api.get<ExchangeRateProvider>(`/admin/exchange-providers/${id}`),
    create: (data: Partial<ExchangeRateProvider>) => api.post<ExchangeRateProvider>("/admin/exchange-providers", data),
    update: (id: string, data: Partial<ExchangeRateProvider>) => api.put<ExchangeRateProvider>(`/admin/exchange-providers/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/exchange-providers/${id}/toggle`, {}),
    checkHealth: (id: string) => api.post(`/admin/exchange-providers/${id}/check-health`, {}),
    delete: (id: string) => api.delete(`/admin/exchange-providers/${id}`),
  },
  pairs: {
    getAll: () => api.get<CurrencyPair[]>("/admin/currency-pairs"),
    get: (id: string) => api.get<CurrencyPair>(`/admin/currency-pairs/${id}`),
    create: (data: Partial<CurrencyPair>) => api.post<CurrencyPair>("/admin/currency-pairs", data),
    update: (id: string, data: Partial<CurrencyPair>) => api.put<CurrencyPair>(`/admin/currency-pairs/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/currency-pairs/${id}/toggle`, {}),
    delete: (id: string) => api.delete(`/admin/currency-pairs/${id}`),
  },
  margins: {
    getAll: () => api.get<FxMargin[]>("/admin/fx-margins"),
    get: (id: string) => api.get<FxMargin>(`/admin/fx-margins/${id}`),
    create: (data: Partial<FxMargin>) => api.post<FxMargin>("/admin/fx-margins", data),
    update: (id: string, data: Partial<FxMargin>) => api.put<FxMargin>(`/admin/fx-margins/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/fx-margins/${id}/toggle`, {}),
    delete: (id: string) => api.delete(`/admin/fx-margins/${id}`),
  },
  rules: {
    getAll: () => api.get<ConversionRule[]>("/admin/conversion-rules"),
    get: (id: string) => api.get<ConversionRule>(`/admin/conversion-rules/${id}`),
    create: (data: Partial<ConversionRule>) => api.post<ConversionRule>("/admin/conversion-rules", data),
    update: (id: string, data: Partial<ConversionRule>) => api.put<ConversionRule>(`/admin/conversion-rules/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/conversion-rules/${id}/toggle`, {}),
    delete: (id: string) => api.delete(`/admin/conversion-rules/${id}`),
  },
  settlement: {
    getAll: () => api.get<SettlementCurrency[]>("/admin/settlement-currencies"),
    get: (id: string) => api.get<SettlementCurrency>(`/admin/settlement-currencies/${id}`),
    create: (data: Partial<SettlementCurrency>) => api.post<SettlementCurrency>("/admin/settlement-currencies", data),
    update: (id: string, data: Partial<SettlementCurrency>) => api.put<SettlementCurrency>(`/admin/settlement-currencies/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/settlement-currencies/${id}/toggle`, {}),
    delete: (id: string) => api.delete(`/admin/settlement-currencies/${id}`),
  },
  regional: {
    getAll: () => api.get<RegionalCurrencyRule[]>("/admin/regional-rules"),
    get: (id: string) => api.get<RegionalCurrencyRule>(`/admin/regional-rules/${id}`),
    create: (data: Partial<RegionalCurrencyRule>) => api.post<RegionalCurrencyRule>("/admin/regional-rules", data),
    update: (id: string, data: Partial<RegionalCurrencyRule>) => api.put<RegionalCurrencyRule>(`/admin/regional-rules/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/regional-rules/${id}/toggle`, {}),
    delete: (id: string) => api.delete(`/admin/regional-rules/${id}`),
  },
  alerts: {
    getAll: () => api.get<ExchangeAlert[]>("/admin/exchange-alerts"),
    get: (id: string) => api.get<ExchangeAlert>(`/admin/exchange-alerts/${id}`),
    create: (data: Partial<ExchangeAlert>) => api.post<ExchangeAlert>("/admin/exchange-alerts", data),
    update: (id: string, data: Partial<ExchangeAlert>) => api.put<ExchangeAlert>(`/admin/exchange-alerts/${id}`, data),
    toggle: (id: string) => api.patch(`/admin/exchange-alerts/${id}/toggle`, {}),
    delete: (id: string) => api.delete(`/admin/exchange-alerts/${id}`),
  },
  reports: {
    dashboard: () => api.get<FxDashboard>("/admin/fx-reports/dashboard"),
    analytics: () => api.get<FxAnalytics>("/admin/fx-reports/analytics"),
    report: (from?: string, to?: string) => api.get<FxReport>(`/admin/fx-reports/report${buildQuery({ from, to })}`),
    volumeTrend: (period?: string) => api.get<{ date: string; volume: number }[]>(`/admin/fx-reports/volume-trend${buildQuery({ period })}`),
  },
  auditLogs: {
    getAll: (params?: { entityType?: string; action?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
      api.get<{ logs: FxAuditLog[]; total: number; page: number; pageSize: number }>(`/admin/fx-audit-logs${buildQuery(params || {})}`),
  },
  exchanges: {
    stats: () => api.get<AdminExchangeStats>("/admin/exchanges/stats"),
    list: (params?: { page?: number; limit?: number; status?: string; search?: string; dateFrom?: string; dateTo?: string }) =>
      api.get<{ data: CustomerExchange[]; total: number; page: number; limit: number; totalPages: number }>(`/admin/exchanges${buildQuery(params || {})}`),
    get: (id: string) => api.get<CustomerExchange>(`/admin/exchanges/${id}`),
    reverse: (id: string, data: { reason: string }) => api.post<{ message: string }>(`/admin/exchanges/${id}/reverse`, data),
  },
}

export interface AdminExchangeStats {
  todaysExchanges: number
  totalFxVolume: number
  fxRevenue: number
  averageExchangeSize: number
  failedExchanges: number
  mostTradedPair: string
}
