import { Upload } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-32 h-32 mb-6 opacity-50 text-8xl">🦦</div>
      <h3 className="text-2xl font-semibold text-foreground mb-2">No files yet</h3>
      <p className="text-foreground/60 max-w-md mb-6">
        Drag and drop files here or click the upload button to get started with your resource hub.
      </p>
      <div className="flex items-center gap-2 text-sm text-primary">
        <Upload className="h-4 w-4" />
        <span>Supports Images, Audio, Videos, and Documents</span>
      </div>
    </div>
  )
}
