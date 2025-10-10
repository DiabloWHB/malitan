'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Ticket,
  Building,
  Building2,
  ArrowUpDown,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Settings,
  X,
  Package,
  ShoppingCart,
  Briefcase
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onClose?: () => void
  isMobile?: boolean
}

interface NavItem {
  name: string
  href: string
  icon: any
  badge?: number
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    name: 'דף הבית',
    href: '/',
    icon: LayoutDashboard,
  }
]

const dailyManagement: NavItem[] = [
  {
    name: 'קריאות שירות',
    href: '/tickets',
    icon: Ticket,
    badge: 12
  },
  {
    name: 'בניינים',
    href: '/buildings',
    icon: Building,
  },
  {
    name: 'מעליות',
    href: '/elevators',
    icon: ArrowUpDown,
  },
  {
    name: 'מלאי חלפים',
    href: '/parts',
    icon: Package,
  },
  {
    name: 'הזמנות רכש',
    href: '/purchase-orders',
    icon: ShoppingCart,
  },
  {
    name: 'פרויקטים',
    href: '/projects',
    icon: Briefcase,
  }
]

const customerManagement: NavItem[] = [
  {
    name: 'לקוחות',
    href: '/clients',
    icon: Users,
  },
  {
    name: 'אנשי קשר',
    href: '/contacts',
    icon: UserCheck,
  },
  {
    name: 'טכנאים',
    href: '/technicians',
    icon: UserCheck,
  },
  {
    name: 'ספקים',
    href: '/suppliers',
    icon: Building2,
  }
]

const reports: NavItem[] = [
  {
    name: 'דוחות בודק',
    href: '/inspector-reports',
    icon: FileText,
  },
  {
    name: 'סטטיסטיקות',
    href: '/analytics',
    icon: BarChart3,
  }
]

const settings: NavItem[] = [
  {
    name: 'הגדרות',
    href: '/settings',
    icon: Settings,
  }
]

export function Sidebar({ collapsed, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname()

  const NavSection = ({ 
    title, 
    items 
  }: { 
    title?: string
    items: NavItem[] 
  }) => (
    <div className={title ? "mb-6" : "mb-4"}>
      {title && !collapsed && (
        <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-gray-500 mb-3">
          {title}
        </h3>
      )}
      <div className="space-y-1">
        {items.map((item, index) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={isMobile ? onClose : undefined}
              className={`
                group flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 transition-all duration-200
                ${isActive 
                  ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500 shadow-sm dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-400' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50 hover:shadow-sm dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800/50'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${collapsed ? '' : 'ml-3'}`} />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full animate-pulse dark:bg-red-900/50 dark:text-red-300">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-16 bottom-0 right-0 z-50 bg-white border-l border-gray-200 transition-all duration-300 overflow-y-auto
          dark:bg-slate-900 dark:border-slate-700
          ${collapsed ? 'w-16' : 'w-72'}
          ${isMobile ? 'lg:translate-x-0' : ''}
        `}
      >
        {/* Mobile close button */}
        {isMobile && (
          <div className="lg:hidden flex justify-end p-4 border-b border-gray-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <nav className="p-4 space-y-2">
          {/* Main Navigation */}
          <NavSection items={navigation} />
          
          {/* Daily Management */}
          <NavSection title="ניהול יומי" items={dailyManagement} />
          
          {/* Customer Management */}
          <NavSection title="ניהול לקוחות" items={customerManagement} />
          
          {/* Reports */}
          <NavSection title="דוחות" items={reports} />
          
          {/* Settings */}
          <NavSection title="הגדרות" items={settings} />
        </nav>
      </aside>
    </>
  )
}