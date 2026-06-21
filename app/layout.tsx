import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'AB Inventory & Sales Hub | AB Card Games',
  description: 'Inventory and sales management for AB Card Games — Made in Ghana, Played Everywhere.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1A1A1A',
              color: '#fff',
              border: '1px solid #3D3D3D',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#D4AF37', secondary: '#000' } },
          }}
        />
      </body>
    </html>
  )
}
