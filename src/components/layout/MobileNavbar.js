import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function MobileNavbar({ 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  isDarkMode, 
  toggleDarkMode,
  user,
  onLogout
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className={`md:hidden transition-all duration-300 ease-in-out ${
      isMobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
    } overflow-hidden`}>
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="px-2 pt-4 pb-6 space-y-1">
          {/* Mobile Navigation Links */}
          <div className="space-y-1">
            <Link 
              href="/" 
              className="block px-3 py-3 text-gray-800 dark:text-gray-200 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-semibold transition-colors rounded-md"
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            <Link 
              href="/services" 
              className="block px-3 py-3 text-gray-800 dark:text-gray-200 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-semibold transition-colors rounded-md"
              onClick={closeMobileMenu}
            >
              Services
            </Link>
            <Link 
              href="/contact" 
              className="block px-3 py-3 text-gray-800 dark:text-gray-200 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-semibold transition-colors rounded-md"
              onClick={closeMobileMenu}
            >
              Contact
            </Link>
          </div>
          
          {/* Mobile Action Links */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
            {user ? (
              <>
                <div className="px-3 py-2 text-gray-800 dark:text-gray-200 text-base font-semibold">
                  Welcome, {user.name}
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    closeMobileMenu();
                  }}
                  className="flex items-center w-full px-3 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-base font-semibold transition-colors rounded-md"
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className="flex items-center px-3 py-3 text-gray-800 dark:text-gray-200 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-semibold transition-colors rounded-md"
                  onClick={closeMobileMenu}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </Link>
                
                <Link 
                  href="/signup" 
                  className="flex items-center px-3 py-3 text-white bg-yellow-500 hover:bg-yellow-600 text-base font-semibold transition-colors rounded-md mx-3"
                  onClick={closeMobileMenu}
                >
                  <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Sign Up
                </Link>
              </>
            )}
            
            <button
              onClick={() => {
                toggleDarkMode();
                closeMobileMenu();
              }}
              className="flex items-center w-full px-3 py-3 text-gray-800 dark:text-gray-200 hover:text-yellow-500 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-semibold transition-colors rounded-md"
            >
              {mounted ? (
                isDarkMode ? (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Light Mode
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Dark Mode
                  </>
                )
              ) : (
                <>
                  <div className="w-5 h-5 mr-3" />
                  Toggle Theme
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
