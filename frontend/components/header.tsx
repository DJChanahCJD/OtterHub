"use client"

import type React from "react"

import { Upload, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileTypeTabs } from "@/components/file-type-tabs"
import { useRef } from "react"

interface HeaderProps {
  onToggleSidebar: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      // Trigger the same upload logic as FileUploadZone
      const event = new CustomEvent("otterhub-upload", { detail: { files } })
      window.dispatchEvent(event)
    }
  }

  return (
    <header className="relative border-b border-white/10 backdrop-blur-xl bg-white/5">
      <div className="px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              className="md:hidden text-white hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-2xl">
                🦦
              </div>
              <div>
                <h1 className="font-bold text-xl text-white">OtterHub</h1>
                <p className="text-xs text-emerald-300/80">All your resources, one place</p>
              </div>
            </div>
          </div>

          {/* Center: File Type Tabs (hidden on mobile) */}
          <div className="hidden lg:block flex-1 max-w-2xl">
            <FileTypeTabs />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search files..."
                className="pl-10 w-48 md:w-64 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-emerald-400"
              />
            </div>

            <Button
              onClick={handleUploadClick}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium"
            >
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </div>

        {/* Mobile File Type Tabs */}
        <div className="lg:hidden mt-4">
          <FileTypeTabs />
        </div>
      </div>
    </header>
  )
}
