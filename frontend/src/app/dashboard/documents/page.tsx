"use client"

import { FileText, Upload } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Button variant="gradient" size="sm"><Upload className="mr-2 h-4 w-4" />Upload</Button>
      </div>
      <Card><CardContent className="text-center py-12 text-muted-foreground"><FileText className="h-12 w-12 mx-auto mb-4 opacity-50" /><p className="text-lg font-medium">No documents uploaded</p><p className="text-sm mt-1">Upload ID, proof of address, or other documents.</p></CardContent></Card>
    </div>
  )
}
