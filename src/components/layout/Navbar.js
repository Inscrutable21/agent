'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useQATracking } from '../../hooks/useQATracking'

export default function Navbar() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { trackUserAction, trackNavigation } = useQATracking('Navigation System')

  useEffect(() => {
    setMounted(true)
    
    // Check if user is logged in
    const userData = localStorage.getItem('userData')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = async () => {
    try {
      // Track logout action
      await trackUserAction('logout_click', 'logout_button', { userId: user?.id })
      
      const userData = localStorage.getItem('userData')
      const userObj = userData ? JSON.parse(userData) : null
      
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userObj?.id,
          email: userObj?.email
        }),
      })
      
      localStorage.removeItem('userData')
      setUser(null)
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.removeItem('userData')
      setUser(null)
      router.push('/')
    }
  }

  const toggleDarkMode = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    
    // Track theme change
    await trackUserAction('theme_toggle', 'theme_button', { 
      from: theme, 
      to: newTheme 
    })
  }

  const handleNavClick = async (href, linkText) => {
    await trackNavigation(href, 'navbar_click')
    await trackUserAction('nav_click', 'nav_link', { href, text: linkText })
  }

  if (!mounted) return null

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex-shrink-0 flex items-center"
              onClick={() => handleNavClick('/', 'Home')}
            >
              <span className="text-2xl font-bold text-yellow-500">SEPJO</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/categories"
              className="text-gray-700 dark:text-gray-300 hover:text-yellow-500 transition-colors"
              onClick={() => handleNavClick('/categories', 'Categories')}
            >
              Categories
            </Link>
            <Link
              href="/billboards"
              className="text-gray-700 dark:text-gray-300 hover:text-yellow-500 transition-colors"
              onClick={() => handleNavClick('/billboards', 'Billboards')}
            >
              Billboards
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-yellow-500 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* User Authentication */}
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 dark:text-gray-300">
                  Welcome, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-yellow-500 transition-colors"
                  onClick={() => handleNavClick('/login', 'Login')}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors"
                  onClick={() => handleNavClick('/signup', 'Sign Up')}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={async () => {
                setIsMobileMenuOpen(!isMobileMenuOpen)
                await trackUserAction('mobile_menu_toggle', 'mobile_menu_button', { 
                  isOpen: !isMobileMenuOpen 
                })
              }}
              className="text-gray-700 dark:text-gray-300 hover:text-yellow-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="/categories"
                className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-yellow-500"
                onClick={() => {
                  handleNavClick('/categories', 'Categories (Mobile)')
                  setIsMobileMenuOpen(false)
                }}
              >
                Categories
              </Link>
              <Link
                href="/billboards"
                className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-yellow-500"
                onClick={() => {
                  handleNavClick('/billboards', 'Billboards (Mobile)')
                  setIsMobileMenuOpen(false)
                }}
              >
                Billboards
              </Link>
              {user ? (
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMobileMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 hover:text-red-700"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-3 py-2 text-gray-700 dark:text-gray-300 hover:text-yellow-500"
                    onClick={() => {
                      handleNavClick('/login', 'Login (Mobile)')
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-3 py-2 text-yellow-500 hover:text-yellow-600"
                    onClick={() => {
                      handleNavClick('/signup', 'Sign Up (Mobile)')
                      setIsMobileMenuOpen(false)
                    }}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
