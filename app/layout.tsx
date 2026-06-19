import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '北京攀岩馆地图',
  description: '北京攀岩馆分布地图，53家场馆一图尽览',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  )
}
