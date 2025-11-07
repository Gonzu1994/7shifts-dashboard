import './globals.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-6xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">{process.env.NEXT_PUBLIC_APP_NAME || '7shifts Live Checklists'}</h1>
            <div className="text-sm text-gray-500">Demo • Next.js + API Routes</div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
