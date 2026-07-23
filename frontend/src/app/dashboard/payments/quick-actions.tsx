"use client"

import { motion } from "framer-motion"
import { Send, CreditCard, Zap, Plug, Building2, Globe, QrCode, Handshake, ArrowLeftRight } from "lucide-react"

const actions = [
  { label: "Send Money", icon: Send, desc: "Transfer funds instantly.", grad: "linear-gradient(135deg, #3B82F6, #2563EB)" },
  { label: "Pay Bills", icon: CreditCard, desc: "Electricity, Water, Internet, TV, School Fees", grad: "linear-gradient(135deg, #10B981, #059669)" },
  { label: "Top Up Mobile", icon: Zap, desc: "Airtime & Data", grad: "linear-gradient(135deg, #F59E0B, #D97706)" },
  { label: "Purchase Electricity", icon: Plug, desc: "Buy Voucher", grad: "linear-gradient(135deg, #8B5CF6, #7C3AED)" },
  { label: "Bank Transfer", icon: Building2, desc: "Local transfer", grad: "linear-gradient(135deg, #F43F5E, #E11D48)" },
  { label: "International Transfer", icon: Globe, desc: "Send money abroad", grad: "linear-gradient(135deg, #06B6D4, #0891B2)" },
  { label: "Crypto Transfer", icon: QrCode, desc: "Send crypto", grad: "linear-gradient(135deg, #F97316, #EA580C)" },
  { label: "QR Payment", icon: Handshake, desc: "Pay or request", grad: "linear-gradient(135deg, #EC4899, #DB2777)" },
  { label: "Request Money", icon: ArrowLeftRight, desc: "Request from someone", grad: "linear-gradient(135deg, #6366F1, #4F46E5)" },
]

export function QuickActions({ onSendMoney }: { onSendMoney: () => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {actions.map((action, i) => {
        const Icon = action.icon
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            onClick={action.label === "Send Money" ? onSendMoney : undefined}
            className="group relative overflow-hidden rounded-2xl p-5 text-left text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
            style={{ background: action.grad }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
            <div className="relative z-10">
              <div className="mb-3 h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-sm mb-0.5">{action.label}</h3>
              <p className="text-[10px] text-white/70 line-clamp-2">{action.desc}</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </motion.button>
        )
      })}
    </div>
  )
}
