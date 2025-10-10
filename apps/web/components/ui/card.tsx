import { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  hover?: boolean
  glass?: boolean
}

export function Card({ children, className = '', hover = false, glass = false, ...props }: CardProps) {
  const baseClasses = glass
    ? 'glass rounded-xl shadow-sm'
    : 'bg-white rounded-xl border border-gray-200 shadow-sm dark:bg-slate-900 dark:border-slate-700'

  const hoverClasses = hover ? 'hover-lift cursor-pointer group' : ''

  return (
    <div className={`${baseClasses} ${hoverClasses} ${className} transition-all duration-200`} {...props}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`p-6 border-b border-gray-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 dark:text-slate-50 ${className}`}>
      {children}
    </h3>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-slate-400 ${className}`}>
      {children}
    </p>
  )
}