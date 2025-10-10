import { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'new' | 'assigned' | 'progress' | 'waiting' | 'done' | 'cancelled' | 'outline' | 'secondary' | 'destructive'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({
  children,
  variant = 'new',
  size = 'md',
  className = ''
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full border'

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm'
  }

  const variantClasses = {
    new: 'status-new',
    assigned: 'status-assigned',
    progress: 'status-progress',
    waiting: 'status-waiting',
    done: 'status-done',
    cancelled: 'status-cancelled',
    outline: 'bg-white border-gray-300 text-gray-700',
    secondary: 'bg-gray-100 border-gray-200 text-gray-800',
    destructive: 'bg-red-100 border-red-200 text-red-800'
  }

  return (
    <span 
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}