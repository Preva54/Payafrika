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

// ─── Interfaces ─────────────────────────────────────────────────

export interface Affiliate {
  id: string
  userId: string
  referralCode: string
  status: string
  businessName?: string
  website?: string
  socialLinks?: string
  country?: string
  preferredCurrency?: string
  taxInfo?: string
  paymentMethod?: string
  bankDetails?: string
  applicationNotes?: string
  availableBalance: number
  pendingBalance: number
  totalEarned: number
  totalPaid: number
  lifetimeReferrals: number
  lifetimeConversions: number
  conversionRate: number
  averageCommission: number
  totalEarnings: number
  currency: string
  createdAt: string
  updatedAt: string
}

export interface CommissionRule {
  id: string
  name: string
  type: string
  rate: number
  productCategory?: string
  minAmount?: number
  maxAmount?: number
  isActive: boolean
  priority: number
  conditions?: string
  createdAt: string
  updatedAt: string
}

export interface Referral {
  id: string
  affiliateId: string
  referredUserId?: string
  referredEmail?: string
  referralCode: string
  status: string
  source?: string
  campaignId?: string
  notes?: string
  convertedAt?: string
  createdAt: string
}

export interface AffiliateCampaign {
  id: string
  name: string
  description?: string
  type: string
  startDate?: string
  endDate?: string
  budget?: number
  spent: number
  status: string
  targetConversions?: number
  targetReferrals?: number
  commissionRate?: number
  commissionType?: string
  rewardDescription?: string
  terms?: string
  createdAt: string
  updatedAt: string
}

export interface Payout {
  id: string
  affiliateId: string
  amount: number
  fee: number
  method: string
  status: string
  transactionReference?: string
  bankReference?: string
  notes?: string
  processedById?: string
  processedAt?: string
  requestedAt: string
  createdAt: string
}

export interface BonusAward {
  id: string
  affiliateId: string
  type: string
  amount: number
  reason: string
  isAwarded: boolean
  awardedAt?: string
  createdAt: string
}

export interface LeaderboardEntry {
  id: string
  affiliateId: string
  period: string
  rank: number
  referrals: number
  earnings: number
  revenue: number
  periodStart?: string
  periodEnd?: string
  updatedAt: string
}

export interface MarketingAsset {
  id: string
  title: string
  description?: string
  type: string
  url: string
  previewUrl?: string
  tags?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AffiliateNotification {
  id: string
  affiliateId: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export interface FraudFlag {
  id: string
  affiliateId: string
  referralId?: string
  type: string
  reason: string
  evidence?: string
  status: string
  resolvedById?: string
  resolvedAt?: string
  createdAt: string
}

export interface Commission {
  id: string
  affiliateId: string
  referralId?: string
  amount: number
  rate: number
  type: string
  status: string
  source?: string
  description?: string
  earnedAt: string
  createdAt: string
}

export interface AffiliateAnalytics {
  totalReferrals: number
  convertedReferrals: number
  totalCommission: number
  pendingCommission: number
  paidCommission: number
  totalPayouts: number
  referralsByMonth: Record<string, number>
  commissionByMonth: Record<string, number>
}

export interface AffiliateDashboardStats {
  totalAffiliates: number
  activeAffiliates: number
  pendingApprovals: number
  totalReferrals: number
  totalConversions: number
  totalCommissions: number
  pendingPayouts: number
  monthlyReferrals: number
  monthlyConversions: number
  monthlyCommissions: number
  openFraudFlags: number
  recentReferrals: Referral[]
  topAffiliates: { id: string; name: string; referrals: number; commissions: number }[]
}

// ─── Affiliate (self-service) API ───────────────────────────────

export const affiliateApi = {
  profile: () => request<Affiliate>("/affiliates/profile"),
  register: (data: Partial<Affiliate>) => request<Affiliate>("/affiliates/register", { method: "POST", body: JSON.stringify(data) }),
  referrals: () => request<Referral[]>("/affiliates/referrals"),
  commissions: () => request<Commission[]>("/affiliates/commissions"),
  payouts: () => request<Payout[]>("/affiliates/payouts"),
  requestPayout: (data: Partial<Payout>) => request<Payout>("/affiliates/payouts", { method: "POST", body: JSON.stringify(data) }),
  analytics: () => request<AffiliateAnalytics>("/affiliates/analytics"),
  marketingAssets: () => request<MarketingAsset[]>("/affiliates/marketing-assets"),
}

// ─── Admin Affiliate Management API ─────────────────────────────

function createCrudApi<T>(basePath: string) {
  return {
    getAll: () => request<T[]>(`/affiliates${basePath}`),
    getById: (id: string) => request<T>(`/affiliates${basePath}/${id}`),
    create: (data: Partial<T>) => request<T>(`/affiliates${basePath}`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<T>) => request<T>(`/affiliates${basePath}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/affiliates${basePath}/${id}`, { method: "DELETE" }),
  }
}

export const adminAffiliateApi = {
  // Affiliates
  affiliates: () => request<Affiliate[]>("/affiliates/admin"),
  affiliate: (id: string) => request<Affiliate>(`/affiliates/admin/${id}`),
  updateAffiliate: (id: string, data: Partial<Affiliate>) => request<Affiliate>(`/affiliates/admin/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Payouts
  payouts: () => request<Payout[]>("/affiliates/admin/payouts"),
  updatePayout: (id: string, data: Partial<Payout>) => request<Payout>(`/affiliates/admin/payouts/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Fraud Flags
  fraudFlags: () => request<FraudFlag[]>("/affiliates/admin/fraud-flags"),
  createFraudFlag: (data: Partial<FraudFlag>) => request<FraudFlag>("/affiliates/admin/fraud-flags", { method: "POST", body: JSON.stringify(data) }),
  updateFraudFlag: (id: string, data: Partial<FraudFlag>) => request<FraudFlag>(`/affiliates/admin/fraud-flags/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Marketing
  marketingAssets: () => request<MarketingAsset[]>("/affiliates/admin/marketing-assets"),
  createMarketingAsset: (data: Partial<MarketingAsset>) => request<MarketingAsset>("/affiliates/admin/marketing-assets", { method: "POST", body: JSON.stringify(data) }),
  updateMarketingAsset: (id: string, data: Partial<MarketingAsset>) => request<MarketingAsset>(`/affiliates/admin/marketing-assets/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteMarketingAsset: (id: string) => request<void>(`/affiliates/admin/marketing-assets/${id}`, { method: "DELETE" }),

  // Leaderboard
  leaderboard: () => request<LeaderboardEntry[]>("/affiliates/admin/leaderboard"),
  generateLeaderboard: (data: Partial<LeaderboardEntry>) => request<LeaderboardEntry[]>("/affiliates/admin/leaderboard/generate", { method: "POST", body: JSON.stringify(data) }),

  // Bonuses
  bonuses: () => request<BonusAward[]>("/affiliates/admin/bonuses"),
  createBonus: (data: Partial<BonusAward>) => request<BonusAward>("/affiliates/admin/bonuses", { method: "POST", body: JSON.stringify(data) }),

  // Commissions
  commissions: () => request<Commission[]>("/affiliates/admin/commissions"),
  updateCommission: (id: string, data: Partial<Commission>) => request<Commission>(`/affiliates/admin/commissions/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  // Dashboard
  dashboard: () => request<AffiliateDashboardStats>("/affiliates/admin/dashboard"),

  // Commission Rules
  rules: createCrudApi<CommissionRule>("/admin/rules"),

  // Campaigns
  campaigns: createCrudApi<AffiliateCampaign>("/admin/campaigns"),
}
