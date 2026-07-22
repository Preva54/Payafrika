export interface Service {
  id: string
  title: string
  description: string
  icon: string
  category: string
  features: string[]
}

export interface Stat {
  label: string
  value: number
  suffix: string
  prefix?: string
}

export interface Testimonial {
  id: string
  name: string
  role: string
  company: string
  avatar: string
  content: string
  rating: number
}

export interface Currency {
  code: string
  name: string
  flag: string
  buyRate: number
  sellRate: number
  change24h: number
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string
}

export interface TimelineStep {
  step: number
  title: string
  description: string
  icon: string
}

export interface Partner {
  id: string
  name: string
  logo: string
}

export interface Country {
  code: string
  name: string
  tradeVolume: string
  services: string[]
  shippingEstimate: string
  documents: string[]
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: "customer" | "business" | "admin"
  kycStatus: "pending" | "verified" | "rejected"
}

export interface Transaction {
  id: string
  type: "payment" | "loan" | "exchange" | "transfer"
  amount: number
  currency: string
  status: "pending" | "completed" | "failed"
  date: string
  description: string
}
