'use client'

import { usePathname } from 'next/navigation'
import Navbar from './layout/Navbar'
import Footer from './layout/Footer'
import ClientLayout from './ClientLayout'

export default function LayoutWrapper({ children }) {
  const pathname = usePathname()
  
  // Don't show navbar/footer on admin pages
  const isAdminPage = pathname?.startsWith('/admin')
  
  if (isAdminPage) {
    return (
      <ClientLayout>
        {children}
      </ClientLayout>
    )
  }

  return (
    <ClientLayout>
      <Navbar />
      {children}
      <Footer />
    </ClientLayout>
  )
}