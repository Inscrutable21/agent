'use client'
import { useRouter } from 'next/navigation'

export default function LogoutButton({ className = '' }) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const userData = localStorage.getItem('userData')
      const user = userData ? JSON.parse(userData) : null
      
      // Call logout API to trigger test generation
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          email: user?.email
        }),
      })
      
      console.log('🚪 Logout API called - test generation triggered')
      
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      // Always clear localStorage and redirect
      localStorage.removeItem('userData')
      router.push('/login')
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={`text-red-600 hover:text-red-800 ${className}`}
    >
      Logout
    </button>
  )
}