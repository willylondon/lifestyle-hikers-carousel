import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Lifestyle Hikers Carousel Creator',
  description: 'Turn hike photos into stories worth saving.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full bg-[#0f120f] antialiased`}>
      <body className="min-h-full bg-[#0f120f] text-stone-100">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
