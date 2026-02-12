import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/ui/theme-provider"
import "react-photo-view/dist/react-photo-view.css"
import { APP_DESC_CN, APP_DESC_EN, APP_NAME } from "@/lib/ui-text";
import { GlobalPreviewLayer } from "@/components/preview/GlobalPreviewLayer"
import { GlobalMusicPlayer } from "@/components/music/GlobalMusicPlayer";

export const metadata: Metadata = {
  title: `${APP_NAME} - ${APP_DESC_EN}`,
  description: APP_DESC_CN,
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
          <GlobalPreviewLayer />
          <GlobalMusicPlayer />
          <Toaster
            position="top-center"
            richColors
            expand={false}
            visibleToasts={5}
            gap={12}
            pauseWhenPageIsHidden
            toastOptions={{
              duration: 3000,
              closeButton: true,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
