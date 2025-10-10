'use client'

import { useState } from 'react'
import { Search, Bell, Moon, Sun, Menu, Building2 } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 right-0 z-40 dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center justify-between h-full px-6">
        {/* Right side - Logo & Company */}
        <div className="flex items-center space-x-reverse space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-reverse space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">מעליתן</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">חברת מעליות ירושלים</p>
            </div>
          </div>
        </div>
        
        {/* Center - Search */}
        <div className="flex-1 max-w-lg mx-8 hidden md:block">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="חיפוש קריאות, בניינים או לקוחות..." 
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-100 dark:placeholder-gray-400"
            />
          </div>
        </div>
        
        {/* Left side - Actions */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User menu */}
          <div className="flex items-center gap-3 pr-4 border-r border-gray-200 dark:border-slate-700">
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">דני כהן</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">מנהל מערכת</p>
            </div>
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">ד</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}