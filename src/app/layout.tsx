import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CarpCast 2.0 - Global Fishing Forecast',
  description: 'Pronóstico global de actividad de pesca con datos meteorológicos, astronómicos e hidrológicos en tiempo real',
  keywords: 'pesca, carpfishing, pronóstico, meteorología, pesca deportiva, actividad, global',
  authors: [{ name: 'CarpCast Team' }],
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${inter.className} h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800`}>
        <div className="min-h-full mobile-safe">
          {children}
        </div>
        <footer className="mt-auto py-4 px-4 text-xs text-gray-500 border-t bg-white/80 backdrop-blur-sm">
          <div className="max-w-md mx-auto text-center space-y-1">
            <p>Datos: <a href="https://open-meteo.com" className="underline">Open-Meteo</a> • <a href="https://www.openstreetmap.org" className="underline">OpenStreetMap</a></p>
            <p>© {new Date().getFullYear()} CarpCast 2.0 - Pronóstico Global de Pesca</p>
          </div>
        </footer>
      </body>
    </html>
  )
}