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

export interface DashboardStats {
  totalPages: number
  publishedPages: number
  draftPages: number
  totalBlogPosts: number
  totalServices: number
  totalProducts: number
  totalTestimonials: number
  totalTeamMembers: number
  totalPartners: number
  totalJobs: number
  totalFaqs: number
  totalMediaFiles: number
  totalPopups: number
  totalForms: number
  totalCampaigns: number
}

export interface ContentPage {
  id: string
  title: string
  slug: string
  content: string
  status: string
  template: string
  metaTitle?: string
  metaDescription?: string
  createdAt: string
  updatedAt: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featuredImage: string
  categoryId: string
  category?: BlogCategory
  tags: string[]
  status: string
  metaTitle?: string
  metaDescription?: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  title: string
  slug: string
  description: string
  icon: string
  price?: number
  features?: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  imageUrl?: string
  category?: string
  features?: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  content: string
  avatarUrl?: string
  rating: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface CmsTeamMember {
  id: string
  name: string
  role: string
  bio: string
  avatarUrl?: string
  email?: string
  order: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface Partner {
  id: string
  name: string
  logoUrl: string
  website?: string
  description?: string
  order: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface JobPosition {
  id: string
  title: string
  slug: string
  location: string
  type: string
  department: string
  description: string
  requirements: string[]
  salary?: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
  order: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface FaqCategory {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface NavigationMenu {
  id: string
  name: string
  location: string
  items: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface FooterConfig {
  id: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Popup {
  id: string
  title: string
  content: string
  trigger: string
  delay: number
  frequency: string
  pages: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  type: string
  startDate: string
  endDate: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface CmsForm {
  id: string
  name: string
  slug: string
  fields: string
  settings: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface LegalPage {
  id: string
  title: string
  slug: string
  content: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface ApiDoc {
  id: string
  title: string
  slug: string
  content: string
  method: string
  endpoint: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface SupportContent {
  id: string
  title: string
  slug: string
  content: string
  category: string
  order: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface Campaign {
  id: string
  name: string
  slug: string
  description: string
  type: string
  startDate: string
  endDate: string
  budget?: number
  status: string
  createdAt: string
  updatedAt: string
}

function createCrudApi<T>(basePath: string) {
  return {
    getAll: () => request<T[]>(`/cms${basePath}`),
    getById: (id: string) => request<T>(`/cms${basePath}/${id}`),
    create: (data: Partial<T>) => request<T>(`/cms${basePath}`, { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<T>) => request<T>(`/cms${basePath}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/cms${basePath}/${id}`, { method: "DELETE" }),
  }
}

export const cmsApi = {
  dashboard: () => request<DashboardStats>("/cms/dashboard"),
  pages: createCrudApi<ContentPage>("/pages"),
  blogPosts: createCrudApi<BlogPost>("/blog/posts"),
  blogCategories: createCrudApi<BlogCategory>("/blog/categories"),
  services: createCrudApi<Service>("/services"),
  products: createCrudApi<Product>("/products"),
  testimonials: createCrudApi<Testimonial>("/testimonials"),
  team: createCrudApi<CmsTeamMember>("/team"),
  partners: createCrudApi<Partner>("/partners"),
  careers: createCrudApi<JobPosition>("/careers"),
  faq: createCrudApi<FaqItem>("/faq"),
  faqCategories: createCrudApi<FaqCategory>("/faq/categories"),
  navigation: createCrudApi<NavigationMenu>("/navigation"),
  footer: {
    get: () => request<FooterConfig | null>("/cms/footer"),
    update: (data: Partial<FooterConfig>) => request<FooterConfig>("/cms/footer", { method: "PUT", body: JSON.stringify(data) }),
  },
  popups: createCrudApi<Popup>("/popups"),
  announcements: createCrudApi<Announcement>("/announcements"),
  forms: createCrudApi<CmsForm>("/forms"),
  legal: createCrudApi<LegalPage>("/legal"),
  apiDocs: createCrudApi<ApiDoc>("/api-docs"),
  supportContent: createCrudApi<SupportContent>("/support-content"),
  campaigns: createCrudApi<Campaign>("/campaigns"),
}
