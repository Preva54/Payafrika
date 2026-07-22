export const stats = [
  { label: "Customers", value: 100000, suffix: "+" },
  { label: "Transactions", value: 5000000000, suffix: "+", prefix: "R" },
  { label: "African Countries", value: 12, suffix: "+" },
  { label: "Platform Uptime", value: 99.9, suffix: "%" },
]

export const services = [
  {
    id: "personal-loans",
    title: "Personal Loans",
    description: "Fast, flexible personal loans with competitive rates. Get approved in minutes and receive funds within 24 hours.",
    icon: "Wallet",
    category: "loans",
    features: ["Loan amounts up to R500,000", "Interest rates from 5.5% APR", "Same-day approval", "Flexible repayment terms", "No hidden fees"],
  },
  {
    id: "business-loans",
    title: "Business Loans",
    description: "Fuel your business growth with tailored financing solutions designed for African enterprises.",
    icon: "Building2",
    category: "loans",
    features: ["Amounts up to R10 million", "Revenue-based repayment", "No collateral required", "Fast disbursement", "Business advisory included"],
  },
  {
    id: "cross-border",
    title: "Cross Border Payments",
    description: "Send and receive money across African borders instantly with the best exchange rates.",
    icon: "Globe",
    category: "payments",
    features: ["Real-time transfers", "40+ African currencies", "Zero hidden fees", "Bank-grade security", "Multi-currency wallets"],
  },
  {
    id: "currency-exchange",
    title: "Digital Currency Exchange",
    description: "Trade digital currencies seamlessly with real-time rates and deep liquidity pools.",
    icon: "TrendingUp",
    category: "exchange",
    features: ["100+ currency pairs", "Live market rates", "0.1% trading fee", "Instant settlement", "Advanced charting tools"],
  },
  {
    id: "import-services",
    title: "Import Services",
    description: "End-to-end import solutions from sourcing to customs clearance and last-mile delivery.",
    icon: "Ship",
    category: "trade",
    features: ["Supplier verification", "Shipping & logistics", "Customs brokerage", "Quality inspection", "Trade financing"],
  },
  {
    id: "export-services",
    title: "Export Services",
    description: "Take your products global with our comprehensive export facilitation platform.",
    icon: "Plane",
    category: "trade",
    features: ["Market research", "Export documentation", "International shipping", "Payment protection", "Buyer matching"],
  },
  {
    id: "trade-compliance",
    title: "Trade Compliance",
    description: "Stay compliant with international trade regulations and avoid costly penalties.",
    icon: "Shield",
    category: "trade",
    features: ["Regulatory monitoring", "Document automation", "Risk assessment", "Audit readiness", "Expert consultation"],
  },
  {
    id: "logistics",
    title: "Logistics",
    description: "Smart logistics solutions connecting African businesses with global supply chains.",
    icon: "Truck",
    category: "trade",
    features: ["Real-time tracking", "Warehouse network", "Route optimization", "Inventory management", "Last-mile delivery"],
  },
  {
    id: "marketplace",
    title: "B2B Marketplace",
    description: "Connect with verified suppliers and buyers across Africa's fastest-growing B2B network.",
    icon: "Store",
    category: "business",
    features: ["Verified listings", "Secure payments", "Trade assurance", "Business profiles", "Rating system"],
  },
  {
    id: "affiliate",
    title: "Affiliate Program",
    description: "Earn commissions by referring businesses and individuals to the PayAfrika platform.",
    icon: "Users",
    category: "business",
    features: ["Up to 20% commission", "Real-time dashboard", "Marketing materials", "Dedicated support", "Monthly payouts"],
  },
  {
    id: "consulting",
    title: "Business Consulting",
    description: "Expert guidance to help your business navigate African markets and scale effectively.",
    icon: "Briefcase",
    category: "business",
    features: ["Market entry strategy", "Financial planning", "Risk management", "Digital transformation", "Growth advisory"],
  },
  {
    id: "financial-solutions",
    title: "Financial Solutions",
    description: "Comprehensive financial products designed for the unique needs of African businesses.",
    icon: "PiggyBank",
    category: "business",
    features: ["Invoice factoring", "Supply chain finance", "Equipment leasing", "Revenue financing", "Treasury management"],
  },
]

export const timelineSteps = [
  { step: 1, title: "Register", description: "Create your free PayAfrika account in under 2 minutes.", icon: "UserPlus" },
  { step: 2, title: "Verify Identity", description: "Secure KYC verification with AI-powered document checking.", icon: "ShieldCheck" },
  { step: 3, title: "Apply or Start Trading", description: "Choose a service or start trading on our platform.", icon: "FileText" },
  { step: 4, title: "Receive Approval", description: "Get instant decisions with our smart approval system.", icon: "CheckCircle" },
  { step: 5, title: "Complete Transactions", description: "Execute transactions with real-time tracking.", icon: "Rocket" },
]

export const currencies = [
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", buyRate: 1, sellRate: 1, change24h: 0 },
  { code: "USD", name: "US Dollar", flag: "🇺🇸", buyRate: 18.25, sellRate: 18.45, change24h: 0.32 },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬", buyRate: 0.021, sellRate: 0.023, change24h: -0.15 },
  { code: "GBP", name: "British Pound", flag: "🇬🇧", buyRate: 23.10, sellRate: 23.40, change24h: 0.18 },
  { code: "EUR", name: "Euro", flag: "🇪🇺", buyRate: 19.85, sellRate: 20.10, change24h: -0.08 },
  { code: "BTC", name: "Bitcoin", flag: "₿", buyRate: 985000, sellRate: 992000, change24h: 2.45 },
  { code: "ETH", name: "Ethereum", flag: "⟠", buyRate: 48500, sellRate: 49200, change24h: 1.82 },
]

export const testimonials = [
  {
    id: "1",
    name: "Thandi Mokoena",
    role: "CEO",
    company: "Mokoena Enterprises",
    avatar: "/images/avatar-1.jpg",
    content: "PayAfrika transformed how we manage cross-border payments. We save 60% on transaction fees compared to traditional banks.",
    rating: 5,
  },
  {
    id: "2",
    name: "James Okafor",
    role: "Founder",
    company: "Lagos Tech Hub",
    avatar: "/images/avatar-2.jpg",
    content: "The loan approval process was incredibly fast. I had funds in my account within 4 hours. Game changer for African startups.",
    rating: 5,
  },
  {
    id: "3",
    name: "Amina Diallo",
    role: "CFO",
    company: "West African Traders",
    avatar: "/images/avatar-3.jpg",
    content: "The B2B marketplace connected us with suppliers we never knew existed. Our supply chain has never been stronger.",
    rating: 5,
  },
  {
    id: "4",
    name: "Kwame Asante",
    role: "Director",
    company: "Ghana Export Alliance",
    avatar: "/images/avatar-4.jpg",
    content: "Import/export documentation used to be a nightmare. PayAfrika's compliance tools handle everything automatically.",
    rating: 4,
  },
  {
    id: "5",
    name: "Naledi Khumalo",
    role: "Entrepreneur",
    company: "Botswana Crafts",
    avatar: "/images/avatar-5.jpg",
    content: "Finally, a financial platform that understands African businesses. The currency exchange rates are the best I've found.",
    rating: 5,
  },
]

export const partners = [
  { id: "1", name: "Standard Bank", logo: "/images/partner-1.svg" },
  { id: "2", name: "Flutterwave", logo: "/images/partner-2.svg" },
  { id: "3", name: "Paystack", logo: "/images/partner-3.svg" },
  { id: "4", name: "MTN Mobile Money", logo: "/images/partner-4.svg" },
  { id: "5", name: "M-Pesa", logo: "/images/partner-5.svg" },
  { id: "6", name: "Ecobank", logo: "/images/partner-6.svg" },
  { id: "7", name: "Access Bank", logo: "/images/partner-7.svg" },
  { id: "8", name: "Ozow", logo: "/images/partner-8.svg" },
]

export const faqs = [
  {
    id: "1",
    question: "How quickly can I get a loan?",
    answer: "Most personal loans are approved within minutes. Once approved, funds are disbursed to your PayAfrika wallet instantly and can be transferred to your bank account within 24 hours.",
    category: "loans",
  },
  {
    id: "2",
    question: "Which African countries does PayAfrika support?",
    answer: "PayAfrika currently operates in 12 African countries including South Africa, Nigeria, Ghana, Kenya, Botswana, Zambia, Zimbabwe, Mozambique, Tanzania, Rwanda, Uganda, and Namibia. We're expanding to 5 more countries this quarter.",
    category: "general",
  },
  {
    id: "3",
    question: "What are the fees for cross-border payments?",
    answer: "Cross-border payments start at just 0.5% per transaction with no hidden fees. Our rates are up to 80% cheaper than traditional bank transfers. We also offer volume discounts for businesses processing over R100,000 per month.",
    category: "payments",
  },
  {
    id: "4",
    question: "How does KYC verification work?",
    answer: "Our AI-powered KYC system verifies your identity using your government-issued ID, proof of address, and a live selfie. The process takes less than 5 minutes and is fully digital. Your documents are encrypted and securely stored.",
    category: "account",
  },
  {
    id: "5",
    question: "Can I hold multiple currencies?",
    answer: "Yes! PayAfrika offers multi-currency wallets supporting ZAR, USD, GBP, EUR, NGN, and more. You can hold, send, receive, and exchange currencies instantly at interbank rates.",
    category: "account",
  },
  {
    id: "6",
    question: "What security measures are in place?",
    answer: "PayAfrika employs bank-grade 256-bit encryption, two-factor authentication, biometric verification, real-time fraud monitoring, and regular security audits. We're PCI DSS compliant and fully regulated.",
    category: "security",
  },
  {
    id: "7",
    question: "How does the B2B marketplace work?",
    answer: "Our B2B marketplace connects verified buyers and suppliers across Africa. You can create a business profile, list products, negotiate deals, and complete transactions securely through PayAfrika's escrow system.",
    category: "business",
  },
  {
    id: "8",
    question: "What import/export documentation support do you offer?",
    answer: "We handle all trade documentation including certificates of origin, commercial invoices, packing lists, bills of lading, and customs declarations. Our compliance team ensures your documents meet all regulatory requirements.",
    category: "trade",
  },
]

export const comparisonData = [
  { feature: "Loan Approval Speed", bank: "3-5 Business Days", payafrika: "Under 24 Hours", bankScore: 20, payafrikaScore: 95 },
  { feature: "Digital Process", bank: "Paper-based", payafrika: "100% Digital", bankScore: 15, payafrikaScore: 100 },
  { feature: "Transaction Fees", bank: "3-5%", payafrika: "0.5-1.5%", bankScore: 30, payafrikaScore: 90 },
  { feature: "Customer Support", bank: "Business Hours", payafrika: "24/7 Live Support", bankScore: 25, payafrikaScore: 95 },
  { feature: "Multi-currency", bank: "Limited", payafrika: "40+ Currencies", bankScore: 20, payafrikaScore: 100 },
  { feature: "Mobile Experience", bank: "Basic App", payafrika: "Premium App", bankScore: 30, payafrikaScore: 98 },
  { feature: "Africa Coverage", bank: "Single Country", payafrika: "12+ Countries", bankScore: 10, payafrikaScore: 92 },
  { feature: "API Access", bank: "Not Available", payafrika: "Full API Suite", bankScore: 0, payafrikaScore: 100 },
]

export const countries = [
  {
    code: "ZA",
    name: "South Africa",
    tradeVolume: "R2.4 Billion",
    services: ["Import Services", "Export Services", "Trade Compliance"],
    shippingEstimate: "3-7 days",
    documents: ["Certificate of Origin", "Commercial Invoice", "Packing List"],
  },
  {
    code: "NG",
    name: "Nigeria",
    tradeVolume: "R1.8 Billion",
    services: ["Import Services", "Trade Compliance", "Logistics"],
    shippingEstimate: "5-12 days",
    documents: ["SONCAP Certificate", "Form M", "Commercial Invoice"],
  },
  {
    code: "KE",
    name: "Kenya",
    tradeVolume: "R950 Million",
    services: ["Export Services", "Cross Border Payments", "Logistics"],
    shippingEstimate: "4-10 days",
    documents: ["Certificate of Origin", " phytosanitary Certificate", "Bill of Lading"],
  },
  {
    code: "GH",
    name: "Ghana",
    tradeVolume: "R720 Million",
    services: ["Import Services", "Trade Compliance", "B2B Marketplace"],
    shippingEstimate: "5-11 days",
    documents: ["GRA Customs Declaration", "Commercial Invoice", "Packing List"],
  },
]
