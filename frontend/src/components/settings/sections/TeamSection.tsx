"use client"

import { useState, useEffect } from "react"
import { settingsApi, type TeamMemberItem } from "@/lib/api"
import { SectionWrapper, SettingsCard } from "../SettingsShared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import { Users, Plus, Trash2, Mail, Shield, UserCog, X, Check } from "lucide-react"

const ROLES = ["owner", "administrator", "finance", "operations", "support", "developer", "readonly"]

export function TeamSection() {
  const [members, setMembers] = useState<TeamMemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ email: "", role: "readonly" })

  useEffect(() => {
    settingsApi.getTeam().then((res) => { setMembers(res); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const inviteMember = async () => {
    if (!invite.email) return
    let member: TeamMemberItem
    try { member = await settingsApi.inviteMember({ memberEmail: invite.email, role: invite.role, permissions: [] }) } catch { return }
    setMembers([...members, member])
    setInvite({ email: "", role: "readonly" })
    setShowInvite(false)
  }

  const updateRole = async (id: string, role: string) => {
    try { await settingsApi.updateMember(id, { role }) } catch { return }
    setMembers(members.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  const remove = async (id: string) => {
    if (!confirm("Remove this team member?")) return
    try { await settingsApi.removeMember(id) } catch { return }
    setMembers(members.filter((m) => m.id !== id))
  }

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-2xl p-6 animate-pulse"><div className="h-4 bg-muted rounded w-full" /></div>)}</div>

  return (
    <SectionWrapper title="Team Management" description="Invite and manage your team members with role-based access.">
      {showInvite && (
        <SettingsCard title="Invite Team Member">
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="colleague@company.com" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <select className="glass rounded-xl px-3 py-2.5 text-sm w-full" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                {ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button variant="gradient" onClick={inviteMember}>
                <Mail className="h-4 w-4 mr-1" /> Send Invite
              </Button>
            </div>
          </div>
        </SettingsCard>
      )}

      <SettingsCard>
        <div className="space-y-3">
          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No team members yet</p>
              <Button variant="gradient" className="mt-4" onClick={() => setShowInvite(true)}>
                <Plus className="h-4 w-4 mr-1" /> Invite Member
              </Button>
            </div>
          )}
          {members.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-4 glass rounded-xl group"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="gradient-bg text-white text-sm">
                    {member.memberEmail[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{member.memberEmail}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-xs ${
                      member.role === "owner" ? "bg-amber-500/10 text-amber-500" :
                      member.role === "administrator" ? "bg-purple-500/10 text-purple-500" :
                      "bg-blue-500/10 text-blue-500"
                    }`}>{member.role}</Badge>
                    <Badge className={`text-xs ${
                      member.status === "active" ? "bg-green-500/10 text-green-500" :
                      member.status === "invited" ? "bg-yellow-500/10 text-yellow-500" :
                      "bg-red-500/10 text-red-500"
                    }`}>{member.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <select className="glass rounded-lg px-2 py-1 text-xs" value={member.role} onChange={(e) => updateRole(member.id, e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
                <button onClick={() => remove(member.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {members.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => setShowInvite(true)}>
              <Plus className="h-4 w-4 mr-1" /> Invite Member
            </Button>
          )}
        </div>
      </SettingsCard>
    </SectionWrapper>
  )
}