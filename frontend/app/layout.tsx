import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import "react-photo-view/dist/react-photo-view.css"


export const metadata: Metadata = {
  title: "OtterHub - A Serverless Personal Cloud Drive",
  description: "A resource management platform for images, audio, videos, and documents",
  icons: {
    icon: [
      {
        url: "/favicon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/favicon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
