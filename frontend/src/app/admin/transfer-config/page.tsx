"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Globe, CreditCard, ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { countriesApi, banksApi, adminTransfersApi, type Country, type BankListResponse, type TransferSettingsResponse } from "@/lib/api"

export default function TransferConfigPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [banks, setBanks] = useState<BankListResponse[]>([])
  const [countrySearch, setCountrySearch] = useState("")
  const [bankSearch, setBankSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [showAddBank, setShowAddBank] = useState(false)
  const [newCountryName, setNewCountryName] = useState("")
  const [newCountryCode, setNewCountryCode] = useState("")
  const [newBankName, setNewBankName] = useState("")
  const [newBankCode, setNewBankCode] = useState("")
  const [settings, setSettings] = useState<TransferSettingsResponse | null>(null)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [settingsError, setSettingsError] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const c = await countriesApi.getAll()
      setCountries(c)
      if (selectedCountry) {
        const b = await banksApi.getAll(selectedCountry)
        setBanks(b)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    adminTransfersApi.getSettings().then(setSettings).catch(() => setSettings(null))
  }, [])

  const handleSaveSettings = async () => {
    if (!settings) return
    setSettingsError("")
    try {
      const updated = await adminTransfersApi.updateSettings({
        feeType: settings.feeType,
        feeRate: Number(settings.feeRate),
        feeFlat: Number(settings.feeFlat),
        vatRate: Number(settings.vatRate),
        minAmount: Number(settings.minAmount),
        maxAmount: Number(settings.maxAmount),
        dailyLimit: Number(settings.dailyLimit),
        maxDailyTransfers: Number(settings.maxDailyTransfers),
        estimatedArrival: settings.estimatedArrival,
      })
      setSettings(updated)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch {
      setSettingsError("Failed to save settings. Check your values and try again.")
    }
  }

  const handleToggleCountry = async (country: Country) => {
    try {
      await countriesApi.update(country.id, { ...country, isEnabled: !country.isEnabled })
      fetchData()
    } catch {}
  }

  const handleToggleBank = async (bank: BankListResponse, countryCode: string) => {
    try {
      await banksApi.update(bank.id, { ...bank, isEnabled: !bank.isEnabled })
      if (selectedCountry === countryCode) {
        const b = await banksApi.getAll(countryCode)
        setBanks(b)
      }
    } catch {}
  }

  const handleAddCountry = async () => {
    if (!newCountryName || !newCountryCode) return
    try {
      await countriesApi.create({
        id: "",
        name: newCountryName,
        code: newCountryCode.toUpperCase(),
        currencyCode: newCountryCode.toUpperCase(),
        isEnabled: true,
      } as Country)
      setNewCountryName("")
      setNewCountryCode("")
      setShowAddCountry(false)
      fetchData()
    } catch {}
  }

  const handleAddBank = async () => {
    if (!newBankName || !newBankCode || !selectedCountry) return
    try {
      await banksApi.create({
        id: "",
        countryCode: selectedCountry,
        name: newBankName,
        code: newBankCode.toUpperCase(),
      } as BankListResponse)
      setNewBankName("")
      setNewBankCode("")
      setShowAddBank(false)
      if (selectedCountry) {
        const b = await banksApi.getAll(selectedCountry)
        setBanks(b)
      }
    } catch {}
  }

  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
  const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transfer Configuration</h1>
          <p className="text-sm text-muted-foreground">Manage countries, banks, and transfer settings</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Countries</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddCountry(true)}><Plus className="mr-2 h-3 w-3" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Search countries..." value={countrySearch} onChange={e => setCountrySearch(e.target.value)} className="mb-3" />
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-secondary rounded-lg animate-pulse" />)}</div>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredCountries.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.code}</span>
                      <div>
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.currencyCode}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleCountry(c)}>
                        {c.isEnabled ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
                {filteredCountries.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No countries found</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Banks</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowAddBank(true)}><Plus className="mr-2 h-3 w-3" />Add</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={selectedCountry || ""} onValueChange={(v) => { setSelectedCountry(v); setBanks([]) }}>
              <SelectTrigger className="mb-3"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {countries.map(c => <SelectItem key={c.id} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedCountry && (
              <>
                <Input placeholder="Search banks..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} className="mb-3" />
                {loading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-secondary rounded-lg animate-pulse" />)}</div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {filteredBanks.map(bank => (
                      <div key={bank.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{bank.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{bank.code || "—"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    {filteredBanks.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No banks found</p>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {settings && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Transfer Fees & Limits</CardTitle>
            <div className="flex items-center gap-2">
              {settingsSaved && <Badge variant="success">Saved</Badge>}
              {settingsError && <span className="text-xs text-destructive">{settingsError}</span>}
              <Button size="sm" onClick={handleSaveSettings}>Save Settings</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>Fee Type</Label>
                <Select
                  value={settings.feeType}
                  onValueChange={v => setSettings(s => s ? { ...s, feeType: v } : s)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                    <SelectItem value="flat">Flat (fixed)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fee Rate (%)</Label>
                <Input type="number" step="0.01" min="0" value={settings.feeRate}
                  onChange={e => setSettings(s => s ? { ...s, feeRate: Number(e.target.value) } : s)} />
              </div>
              <div className="space-y-1">
                <Label>Flat Fee</Label>
                <Input type="number" step="0.01" min="0" value={settings.feeFlat}
                  onChange={e => setSettings(s => s ? { ...s, feeFlat: Number(e.target.value) } : s)} />
              </div>
              <div className="space-y-1">
                <Label>VAT Rate (%)</Label>
                <Input type="number" step="0.01" min="0" value={settings.vatRate}
                  onChange={e => setSettings(s => s ? { ...s, vatRate: Number(e.target.value) } : s)} />
              </div>
              <div className="space-y-1">
                <Label>Min Amount</Label>
                <Input type="number" min="0" value={settings.minAmount}
                  onChange={e => setSettings(s => s ? { ...s, minAmount: Number(e.target.value) } : s)} />
              </div>
              <div className="space-y-1">
                <Label>Max Amount</Label>
                <Input type="number" min="0" value={settings.maxAmount}
                  onChange={e => setSettings(s => s ? { ...s, maxAmount: Number(e.target.value) } : s)} />
              </div>
              <div className="space-y-1">
                <Label>Daily Limit</Label>
                <Input type="number" min="0" value={settings.dailyLimit}
                  onChange={e => setSettings(s => s ? { ...s, dailyLimit: Number(e.target.value) } : s)} />
              </div>
              <div className="space-y-1">
                <Label>Max Transfers / Day</Label>
                <Input type="number" min="1" value={settings.maxDailyTransfers}
                  onChange={e => setSettings(s => s ? { ...s, maxDailyTransfers: Number(e.target.value) } : s)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Estimated Arrival Message</Label>
                <Input value={settings.estimatedArrival}
                  onChange={e => setSettings(s => s ? { ...s, estimatedArrival: e.target.value } : s)} />
              </div>
              <div className="space-y-1">
                <Label>Blacklisted Accounts (comma separated)</Label>
                <Input value={settings.blacklistedAccounts}
                  onChange={e => setSettings(s => s ? { ...s, blacklistedAccounts: e.target.value } : s)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Fees are charged to the sender. Daily limits apply per user, per country.
            </p>
          </CardContent>
        </Card>
      )}

      {showAddCountry && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Country Name</Label><Input value={newCountryName} onChange={e => setNewCountryName(e.target.value)} placeholder="e.g. South Africa" /></div>
              <div className="space-y-1"><Label>Country Code</Label><Input value={newCountryCode} onChange={e => setNewCountryCode(e.target.value)} placeholder="e.g. ZA" maxLength={3} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddCountry}>Add Country</Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddCountry(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showAddBank && selectedCountry && (
        <Card className="border-primary">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Bank Name</Label><Input value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="e.g. First National Bank" /></div>
              <div className="space-y-1"><Label>Bank Code</Label><Input value={newBankCode} onChange={e => setNewBankCode(e.target.value)} placeholder="e.g. FNB" maxLength={10} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddBank}>Add Bank</Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddBank(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}