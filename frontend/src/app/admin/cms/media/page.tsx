"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Image, Upload } from "lucide-react"

export default function MediaLibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Media Library</h1>
          <p className="text-muted-foreground">Upload and manage media files.</p>
        </div>
        <Button size="sm"><Upload className="mr-2 h-4 w-4" />Upload</Button>
      </div>
      <Card className="glass-card rounded-2xl p-6">
        <CardHeader className="px-0 pt-0"><CardTitle>All Media</CardTitle></CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Image className="h-12 w-12 mb-4 opacity-40" />
            <p>Media library coming soon.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
