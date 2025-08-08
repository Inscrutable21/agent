import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function AdminSidebar({ admin, onLogout, mobile = false, onClose }) {
  const pathname = usePathname()

  const menuItems = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: '📊' },
    { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
    { name: 'Billboards', href: '/admin/billboards', icon: '🏢' },
    { name: 'Categories', href: '/admin/categories', icon: '📂' },
    { name: 'Cities', href: '/admin/cities', icon: '🏙️' },
    { name: 'Inquiries', href: '/admin/inquiries', icon: '📧' },
    { name: 'Personas', href: '/admin/personas', icon: '👥' },
    {
      name: 'QA Management',
      href: '/admin/qa',
      icon: '🔍',
      children: [
        { name: 'Test Cases', href: '/admin/qa' },
        { name: 'Risk Assessment', href: '/admin/qa/risk-assessment' },
        { name: 'Auto Triggers', href: '/admin/qa/auto-triggers' }
      ]
    },
    // NEW DEDICATED SECTION
    {
      name: 'AI Test Generator',
      href: '/admin/qa/ai-test-generator',
      icon: '🤖',
      badge: 'Sub-Initiative #3',
      children: [
        { name: 'Requirements Input', href: '/admin/qa/ai-test-generator' },
        { name: 'Generated Tests', href: '/admin/qa/ai-test-generator/results' },
        { name: 'Risk Analysis', href: '/admin/qa/ai-test-generator/risk-analysis' },
        { name: 'Smart Generation', href: '/admin/qa/ai-test-generator/smart-tests' }
      ]
    }
  ]

  const handleLinkClick = () => {
    if (mobile && onClose) {
      onClose()
    }
  }

  return (
    <div className="flex flex-col w-64 bg-gray-800 text-white h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Image
            src="/logo.png"
            alt="Sepjo Logo"
            width={32}
            height={32}
            className="h-8 w-auto"
          />
          <span className="text-xl font-bold">
            <span className="text-yellow-400">Sep</span>jo Admin
          </span>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Admin Info */}
      {admin && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-gray-900 font-semibold text-lg">
                {admin.name?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{admin.name}</p>
              <p className="text-xs text-gray-400">{admin.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            onClick={handleLinkClick}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
              pathname === item.href 
                ? 'bg-gray-700 text-yellow-400' 
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-red-600 hover:text-white transition-colors duration-200"
        >
          <span className="mr-3">🚪</span>
          Logout
        </button>
      </div>
    </div>
  )
}
