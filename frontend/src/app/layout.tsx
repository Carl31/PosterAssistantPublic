// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthContext'
import Notification from '@/components/Notification'
import WifiGuard from '@/components/WifiGuard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SickShotsAI',
  description: 'Create custom AI car posters',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning={true}>
        <Notification />
        <WifiGuard>
          <AuthProvider>{children}</AuthProvider>
        </WifiGuard>
      </body>
    </html>
  )
}