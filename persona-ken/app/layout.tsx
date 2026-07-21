import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Header from './components/Header'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '川内2号くん',
  description: 'AI人格との壁打ち・議論シミュレーション',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-gray-50 min-h-screen`}>
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
