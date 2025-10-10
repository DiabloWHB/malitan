'use client'

import { useState, useEffect } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Handle sidebar toggle for mobile
  const handleMenuClick = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  // Add keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault()
        if (!isMobile) {
          setSidebarCollapsed(!sidebarCollapsed)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sidebarCollapsed, isMobile])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <Header 
        onMenuClick={handleMenuClick}
        sidebarCollapsed={sidebarCollapsed}
      />

      {/* Sidebar - Desktop */}
      {!isMobile && (
        <Sidebar 
          collapsed={sidebarCollapsed}
        />
      )}

      {/* Sidebar - Mobile */}
      {isMobile && sidebarOpen && (
        <Sidebar 
          collapsed={false}
          onClose={handleSidebarClose}
          isMobile={true}
        />
      )}

      {/* Main Content */}
      <main 
        className={`
          pt-16 min-h-screen transition-all duration-300
          ${!isMobile ? (sidebarCollapsed ? 'mr-16' : 'mr-72') : ''}
        `}
      >
        {children}
      </main>
    </div>
  )
}