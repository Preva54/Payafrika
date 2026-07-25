const API_URL = "https://pafrikav2-api.ambitiousocean-b7255ba5.northeurope.azurecontainerapps.io/api"

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
  userId: string
  amount: number
  interestRate: number
  termMonths: number
  status: string
  purpose: string | null
  loanType: string | null
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  balance: number
  paidAmount: number
  createdAt: string
  approvedAt: string | null
}

export interface WalletResponse {
  id: string
  userId: string
  currency: string
  balance: number
}

export interface WalletOverviewResponse {
  totalBalance: number
  availableBalance: number
  pendingBalance: number
  monthlyCashFlow: number
  monthlyIncome: number
  monthlySpending: number
}

export interface CurrencyWalletResponse {
  currency: string
  flag: string
  balance: number
  zarValue: number
  changePercent: number
  miniGraph: number[]
}

export interface WalletAnalyticsResponse {
  incomeVsExpenses: { label: string; value: number }[]
  monthlyBalance: { label: string; value: number }[]
  spendingCategories: { label: string; value: number }[]
  topRecipients: { label: string; value: number }[]
  averageTransaction: number
  largestTransaction: number
  cashFlow: number
}

export interface SpendingInsightResponse {
  message: string
  type: string
  recommendations: { title: string; description: string; action: string }[]
}

export interface LinkedBankResponse {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  isVerified: boolean
  isPrimary: boolean
}

export interface WalletNotificationResponse {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export interface SecurityInfoResponse {
  loginHistory: { id: string; device: string; location: string; ip: string; time: string; isCurrent: boolean }[]
  activeDevices: { id: string; name: string; type: string; lastActive: string }[]
  biometricEnabled: boolean
  twoFactorEnabled: boolean
  securityScore: number
  trustedDevices: string[]
}

export interface CardResponse {
  id: string
  type: string
  lastFour: string
  expiry: string
  isFrozen: boolean
  isVirtual: boolean
  limit: number | null
}

export interface ExchangeRateResponse {
  from: string
  to: string
  rate: number
  spread: number
  lastUpdated: string
}

export interface QRResponse {
  qrCode: string
  paymentLink: string
  walletAddress: string
  accountNumber: string
}

export const authApi = {
  register: (data: { fullName: string; email: string; password: string; phoneNumber?: string; country?: string; role?: string }) =>
    api.post<AuthResponse>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data),
  me: () => api.get<UserInfo>("/auth/me"),
}

export interface LoanOverview {
  activeLoanAmount: number
  activeLoanStatus: string
  activeLoanProgress: number
  availableCredit: number
  monthlyRepayment: number
  nextPaymentDate: string | null
  creditScore: number
  creditScoreRating: string
}

export interface RepaymentScheduleItem {
  paymentNumber: number
  dueDate: string
  principal: number
  interest: number
  fees: number
  total: number
  balanceAfter: number
  status: string
}

export interface CreditFactor {
  name: string
  score: number
  maxScore: number
  status: string
  tip: string | null
}

export interface ScoreHistoryPoint {
  date: string
  score: number
}

export interface Recommendation {
  title: string
  description: string
  impact: string
}

export interface CreditScoreResponse {
  score: number
  rating: string
  nextMilestone: string | null
  scoreToNextMilestone: number | null
  factors: CreditFactor[]
  history: ScoreHistoryPoint[]
  recommendations: Recommendation[]
}

export interface EligibilityRequest {
  monthlyIncome: number
  employmentStatus: string
  businessRevenue?: number
  existingDebt?: number
  creditScore?: number
  loanPurpose: string
  loanAmount: number
  loanTermMonths: number
}

export interface EligibilityResponse {
  eligibilityPercentage: number
  maximumLoanAmount: number
  estimatedInterestRate: number
  monthlyInstallment: number
  approvalProbability: number
  estimatedProcessingTime: string
  requiredDocuments: string[]
}

export interface CalculatorRequest {
  loanAmount: number
  interestRate: number
  durationMonths: number
  paymentFrequency: string
  processingFee?: number
  insuranceAmount?: number
}

export interface CalculatorResponse {
  monthlyRepayment: number
  totalRepayment: number
  totalInterest: number
  processingFee: number
  insurance: number
  earlySettlementAmount: number
  repaymentSchedule: RepaymentScheduleItem[]
}

export interface LoanPaymentRequest {
  loanId: string
  amount: number
  paymentMethod: string
}

export interface LoanNotification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

export interface LoanAnalytics {
  borrowingHistory: { label: string; value: number }[]
  repaymentTrend: { label: string; value: number }[]
  totalInterestPaid: number
  totalPrincipalPaid: number
  creditGrowth: number
  loanUtilization: number
  interestPaid: { label: string; value: number }[]
  principalPaid: { label: string; value: number }[]
}

export interface LoanDocument {
  id: string
  name: string
  type: string
  status: string
  uploadedAt: string
  url: string | null
  size: number
}

export const loansApi = {
  getAll: () => api.get<LoanResponse[]>("/loans"),
  getById: (id: string) => api.get<LoanResponse>(`/loans/${id}`),
  apply: (data: { amount: number; interestRate: number; termMonths: number; purpose?: string; loanType?: string }) =>
    api.post<LoanResponse>("/loans", data),
  overview: () => api.get<LoanOverview>("/loans/overview"),
  getRepaymentSchedule: (id: string) => api.get<RepaymentScheduleItem[]>(`/loans/${id}/repayment-schedule`),
  creditScore: () => api.get<CreditScoreResponse>("/loans/credit-score"),
  eligibility: (data: EligibilityRequest) => api.post<EligibilityResponse>("/loans/eligibility", data),
  calculate: (data: CalculatorRequest) => api.post<CalculatorResponse>("/loans/calculator", data),
  makePayment: (data: LoanPaymentRequest) => api.post<LoanResponse>("/loans/payment", data),
  notifications: () => api.get<LoanNotification[]>("/loans/notifications"),
  analytics: () => api.get<LoanAnalytics>("/loans/analytics"),
  documents: () => api.get<LoanDocument[]>("/loans/documents"),
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
  deposit: (amount: number, currency = "ZAR", method?: string, description?: string) =>
    api.post<WalletResponse>("/wallet/deposit", { amount, currency, method, description }),
  withdraw: (amount: number, currency = "ZAR", method?: string, description?: string) =>
    api.post<WalletResponse>("/wallet/withdraw", { amount, currency, method, description }),
  transfer: (amount: number, fromCurrency: string, toCurrency: string, recipient?: string) =>
    api.post<{ fromAmount: number; toAmount: number; fromCurrency: string; toCurrency: string }>("/wallet/transfer", { amount, fromCurrency, toCurrency, recipient }),
  exchange: (amount: number, fromCurrency: string, toCurrency: string) =>
    api.post<{ fromAmount: number; toAmount: number; fee: number; rate: number; fromCurrency: string; toCurrency: string }>("/wallet/exchange", { amount, fromCurrency, toCurrency }),
  overview: () => api.get<WalletOverviewResponse>("/wallet/overview"),
  balances: () => api.get<CurrencyWalletResponse[]>("/wallet/balances"),
  analytics: () => api.get<WalletAnalyticsResponse>("/wallet/analytics"),
  insights: () => api.get<SpendingInsightResponse[]>("/wallet/insights"),
  notifications: () => api.get<WalletNotificationResponse[]>("/wallet/notifications"),
  transactions: (page = 1, limit = 20) => api.get<Transaction[]>(`/wallet/transactions?page=${page}&limit=${limit}`),
  linkedBanks: () => api.get<LinkedBankResponse[]>("/wallet/linked-banks"),
  linkBank: (data: { bankName: string; accountName: string; accountNumber: string }) =>
    api.post<LinkedBankResponse>("/wallet/linked-banks", data),
  unlinkBank: (id: string) => api.delete(`/wallet/linked-banks/${id}`),
  exchangeRates: () => api.get<ExchangeRateResponse[]>("/wallet/exchange-rates"),
  security: () => api.get<SecurityInfoResponse>("/wallet/security"),
  cards: () => api.get<CardResponse[]>("/wallet/cards"),
  qr: (amount?: number, currency = "ZAR", description?: string) =>
    api.get<QRResponse>(`/wallet/qr?amount=${amount ?? 0}&currency=${currency}&description=${description ?? ""}`),
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

export interface PaginatedResponse {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const dashboardApi = {
  loans: () => api.get<LoanResponse[]>("/loans"),
  wallet: () => api.get<WalletResponse>("/wallet"),
  transactions: () => api.get<Transaction[]>("/wallet/transactions"),
  user: () => api.get<UserInfo>("/auth/me"),
};

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  userId: string;
  userName: string;
  userEmail: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  messageCount: number;
  unreadCount: number;
  attachments: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  content: string;
  isFromAgent: boolean;
  isInternalNote: boolean;
  createdAt: string;
  readAt?: string;
  attachments: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface TicketListQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  priority?: string;
  assignedToId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateTicketRequest {
  subject: string;
  description: string;
  category?: string;
  priority?: string;
}

export interface SendMessageRequest {
  content: string;
  isInternalNote?: boolean;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  status: string;
  isFeatured: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  authorId?: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface SupportCategory {
  id: string;
  name: string;
  key: string;
  description: string;
  icon: string;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

export interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  averageResolutionTimeHours: number;
  satisfactionScore: number;
  ticketsByCategory: Record<string, number>;
  ticketsByPriority: Record<string, number>;
}

export const supportApi = {
  getTickets: (query?: TicketListQuery) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return api.get<PaginatedResponse<SupportTicket>>(`/support/tickets?${params.toString()}`);
  },
  getTicket: (id: string) => api.get<SupportTicket & { messages: ChatMessage[] }>(`/support/tickets/${id}`),
  createTicket: (data: CreateTicketRequest) => api.post<SupportTicket>("/support/tickets", data),
  updateTicket: (id: string, data: Partial<CreateTicketRequest>) => api.patch<SupportTicket>(`/support/tickets/${id}`, data),
  addMessage: (id: string, data: SendMessageRequest) => api.post<ChatMessage>(`/support/tickets/${id}/messages`, data),
  markMessageRead: (ticketId: string, messageId: string) => api.post(`/support/tickets/${ticketId}/messages/${messageId}/read`),
  getCategories: () => api.get<SupportCategory[]>("/support/categories"),
  getKnowledgeBase: (query?: { page?: number; limit?: number; category?: string; status?: string; isFeatured?: boolean; search?: string }) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return api.get<PaginatedResponse<KnowledgeBaseArticle>>(`/support/knowledge-base?${params.toString()}`);
  },
  getKnowledgeBaseArticle: (slug: string) => api.get<KnowledgeBaseArticle>(`/support/knowledge-base/${slug}`),
  getStats: () => api.get<TicketStats>("/support/stats"),
};

export const adminSupportApi = {
  getTickets: (query?: TicketListQuery) => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value));
      });
    }
    return api.get<PaginatedResponse<SupportTicket>>(`/support/tickets?${params.toString()}`);
  },
  getTicket: (id: string) => api.get<SupportTicket & { messages: ChatMessage[] }>(`/support/tickets/${id}`),
  updateTicket: (id: string, data: Partial<CreateTicketRequest & { assignedToId?: string }>) => api.patch<SupportTicket>(`/support/tickets/${id}`, data),
  addMessage: (id: string, data: SendMessageRequest) => api.post<ChatMessage>(`/support/tickets/${id}/messages`, data),
  getStats: () => api.get<TicketStats>("/support/stats"),
};

// ──────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────

export interface ProfileSettings {
  id: string;
  fullName: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  occupation?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
  role: string;
  kycStatus?: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  hasPasskeys: boolean;
  recoveryCodes: string[];
  loginNotifications: boolean;
  autoLogoutMinutes: number;
  hasSecurityQuestions: boolean;
}

export interface TwoFactorSetup {
  secretKey: string;
  qrCodeUrl: string;
  recoveryCodes: string[];
}

export interface NotificationPreferences {
  channels: Record<string, Record<string, boolean>>;
}

export interface BusinessProfileSettings {
  id?: string;
  businessName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  industry?: string;
  companyAddress?: string;
  website?: string;
  businessDescription?: string;
  logoUrl?: string;
  directors?: string;
  bankAccountDetails?: string;
  settlementPreference?: string;
  documents?: string;
}

export interface WalletSettings {
  defaultCurrency?: string;
  autoCurrencyConversion: boolean;
  autoSettlement: boolean;
  dailyLimit?: number;
  monthlyLimit?: number;
  autoTopUp: boolean;
  autoTopUpThreshold?: number;
  autoTopUpAmount?: number;
}

export interface PaymentMethod {
  id: string;
  type: string;
  lastFour?: string;
  expiry?: string;
  cardholderName?: string;
  isDefault: boolean;
  isVerified: boolean;
  createdAt: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPreview: string;
  environment: string;
  scopes: string[];
  allowedDomains: string[];
  callbackUrls: string[];
  webhookUrl?: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string;
  secret: string;
  environment: string;
}

export interface TeamMemberItem {
  id: string;
  memberEmail: string;
  role: string;
  permissions: string[];
  status: string;
  invitedAt: string;
  acceptedAt?: string;
}

export interface ConnectedDeviceItem {
  id: string;
  deviceName: string;
  deviceType: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
  isTrusted: boolean;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  category: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface IntegrationItem {
  id: string;
  provider: string;
  isConnected: boolean;
  permissions: string[];
  syncStatus: string;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface BillingInfo {
  plan: string;
  billingEmail?: string;
  billingAddress?: string;
  taxId?: string;
  autoRenew: boolean;
  nextBillingDate?: string;
  invoices: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  pdfUrl?: string;
}

export interface AppearanceSettings {
  theme: string;
  accentColor: string;
  dashboardLayout: string;
  sidebarStyle: string;
  compactMode: boolean;
  animationIntensity: string;
  fontSize: string;
}

export interface LanguageRegionSettings {
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  timeZone: string;
  numberFormat: string;
}

export interface PrivacySettings {
  dataSharing: boolean;
  marketingEmails: boolean;
  analyticsPermissions: boolean;
  personalizedRecommendations: boolean;
  profileVisibility: boolean;
}

export interface AccountPreferences {
  defaultLandingPage?: string;
  startupPage?: string;
  preferredPaymentMethod?: string;
  defaultWallet?: string;
  favoriteServices?: string;
}

export const settingsApi = {
  getProfile: () => api.get<ProfileSettings>("/settings/profile"),
  updateProfile: (data: Partial<ProfileSettings>) => api.put<ProfileSettings>("/settings/profile", data),
  updateAvatar: (avatarUrl: string) => api.post<ProfileSettings>("/settings/profile/avatar", { avatarUrl }),

  getSecurity: () => api.get<SecuritySettings>("/settings/security"),
  changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => api.put("/settings/security/password", data),
  toggleTwoFactor: (data: { enabled: boolean; code?: string }) => api.put("/settings/security/two-factor", data),
  setupTwoFactor: () => api.post<TwoFactorSetup>("/settings/security/two-factor/setup"),

  getNotifications: () => api.get<NotificationPreferences>("/settings/notifications"),
  updateNotification: (data: { category: string; channel: string; enabled: boolean }) => api.put("/settings/notifications", data),

  getBusiness: () => api.get<BusinessProfileSettings>("/settings/business"),
  updateBusiness: (data: Partial<BusinessProfileSettings>) => api.put<BusinessProfileSettings>("/settings/business", data),

  getWalletSettings: () => api.get<WalletSettings>("/settings/wallet"),
  updateWalletSettings: (data: WalletSettings) => api.put("/settings/wallet", data),

  getPaymentMethods: () => api.get<PaymentMethod[]>("/settings/payment-methods"),
  removePaymentMethod: (id: string) => api.delete(`/settings/payment-methods/${id}`),

  getApiKeys: () => api.get<ApiKeyItem[]>("/settings/api-keys"),
  createApiKey: (data: { name: string; environment: string; scopes?: string[]; allowedDomains?: string[]; callbackUrls?: string[]; webhookUrl?: string }) =>
    api.post<CreateApiKeyResult>("/settings/api-keys", data),
  deleteApiKey: (id: string) => api.delete(`/settings/api-keys/${id}`),

  getTeam: () => api.get<TeamMemberItem[]>("/settings/team"),
  inviteMember: (data: { memberEmail: string; role: string; permissions?: string[] }) =>
    api.post<TeamMemberItem>("/settings/team/invite", data),
  updateMember: (id: string, data: { role?: string; permissions?: string[]; status?: string }) =>
    api.put<TeamMemberItem>(`/settings/team/${id}`, data),
  removeMember: (id: string) => api.delete(`/settings/team/${id}`),

  getDevices: () => api.get<ConnectedDeviceItem[]>("/settings/devices"),
  toggleTrustDevice: (id: string) => api.put(`/settings/devices/${id}/trust`),
  removeDevice: (id: string) => api.delete(`/settings/devices/${id}`),
  removeAllDevices: () => api.delete("/settings/devices"),

  getActivityLogs: (page?: number, limit?: number, category?: string) => {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    if (category) params.set("category", category);
    return api.get<ActivityLogItem[]>(`/settings/activity?${params.toString()}`);
  },

  getIntegrations: () => api.get<IntegrationItem[]>("/settings/integrations"),
  connectIntegration: (provider: string) => api.post<IntegrationItem>(`/settings/integrations/${provider}/connect`),
  disconnectIntegration: (provider: string) => api.post(`/settings/integrations/${provider}/disconnect`),

  getBilling: () => api.get<BillingInfo>("/settings/billing"),
  updateBilling: (data: Partial<BillingInfo>) => api.put("/settings/billing", data),

  getAppearance: () => api.get<AppearanceSettings>("/settings/appearance"),
  updateAppearance: (data: AppearanceSettings) => api.put("/settings/appearance", data),

  getLanguageRegion: () => api.get<LanguageRegionSettings>("/settings/language-region"),
  updateLanguageRegion: (data: LanguageRegionSettings) => api.put("/settings/language-region", data),

  getPrivacy: () => api.get<PrivacySettings>("/settings/privacy"),
  updatePrivacy: (data: PrivacySettings) => api.put("/settings/privacy", data),

  getAccountPreferences: () => api.get<AccountPreferences>("/settings/preferences"),
  updateAccountPreferences: (data: AccountPreferences) => api.put("/settings/preferences", data),

  deleteAccount: (data: { password: string; twoFactorCode?: string; downloadData: boolean }) =>
    api.post("/settings/delete-account", data),
};

// ──────────────────────────────────────────────
// KYC
// ──────────────────────────────────────────────

export interface KycStatusInfo {
  id: string;
  status: string;
  applicationType: string;
  overallProgress: number;
  completedSteps: string[];
  identityStatus: { status: string; updatedAt?: string };
  addressStatus: { status: string; updatedAt?: string };
  phoneStatus: { status: string; updatedAt?: string };
  emailStatus: { status: string; updatedAt?: string };
  selfieStatus: { status: string; updatedAt?: string };
  businessStatus: { status: string; updatedAt?: string };
  bankStatus: { status: string; updatedAt?: string };
  taxStatus: { status: string; updatedAt?: string };
  submittedAt?: string;
  timeline: KycTimelineEvent[];
}

export interface KycTimelineEvent {
  eventType: string;
  description: string;
  createdAt: string;
}

export interface KycDocumentInfo {
  id: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  status: string;
  ocrData?: string;
  qualityScore: number;
}

export interface KycSubmitResult {
  status: string;
  message: string;
  submittedAt: string;
}

export interface KycAdminApp {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  status: string;
  applicationType: string;
  riskScore: number;
  fraudScore: number;
  aiConfidenceScore: number;
  country?: string;
  submittedAt?: string;
  createdAt: string;
}

export interface KycAdminDetail {
  id: string;
  status: string;
  applicationType: string;
  riskScore: number;
  fraudScore: number;
  aiConfidenceScore: number;
  personalInfo?: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    countryOfResidence: string;
    nationalIdNumber?: string;
    passportNumber?: string;
    driversLicenseNumber?: string;
    taxNumber?: string;
  };
  contact?: {
    phoneCountryCode?: string;
    residentialAddress?: string;
    province?: string;
    city?: string;
    postalCode?: string;
  };
  bank?: {
    bankName: string;
    accountNumber: string;
    branchCode?: string;
    accountHolderName: string;
  };
  business?: {
    businessName: string;
    registrationNumber: string;
    taxNumber?: string;
    vatNumber?: string;
    industry?: string;
    website?: string;
    yearsInOperation?: string;
  };
  documents: KycDocumentInfo[];
  reviews: { id: string; reviewerName: string; action: string; notes?: string; createdAt: string }[];
  timeline: KycTimelineEvent[];
  userName: string;
  userEmail: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface KycAnalytics {
  totalApplications: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  averageReviewTimeHours: number;
  fraudDetectionRate: number;
  aiSuccessRate: number;
  countryDistribution: Record<string, number>;
  dailyVolume: { date: string; count: number }[];
}

export const kycApi = {
  getStatus: () => api.get<KycStatusInfo>("/kyc/status"),
  start: (type = "individual") => api.post<KycStatusInfo>(`/kyc/start?type=${type}`),
  updatePersonalInfo: (data: Record<string, unknown>) => api.put("/kyc/personal-info", data),
  updateContact: (data: Record<string, unknown>) => api.put("/kyc/contact", data),
  uploadDocument: (documentType: string, documentSide: string, file: File) => {
    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("documentSide", documentSide);
    formData.append("file", file);
    return api.post<KycDocumentInfo>("/kyc/documents", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  updateBank: (data: Record<string, unknown>) => api.put("/kyc/bank", data),
  updateBusiness: (data: Record<string, unknown>) => api.put("/kyc/business", data),
  submitForReview: () => api.post<KycSubmitResult>("/kyc/submit"),
  getDocuments: () => api.get<KycDocumentInfo[]>("/kyc/documents"),

  // Admin
  getApplications: (status?: string, country?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (country) params.set("country", country);
    return api.get<KycAdminApp[]>(`/kyc/admin/applications?${params.toString()}`);
  },
  getApplicationDetail: (id: string) => api.get<KycAdminDetail>(`/kyc/admin/applications/${id}`),
  reviewApplication: (id: string, data: { action: string; notes?: string }) =>
    api.post(`/kyc/admin/applications/${id}/review`, data),
  getAnalytics: () => api.get<KycAnalytics>("/kyc/admin/analytics"),
};
