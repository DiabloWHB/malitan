import { useEffect, useState } from 'react'
import { Card } from './card'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  iconColor?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray'
  loading?: boolean
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'blue',
  loading = false
}: StatsCardProps) {
  const [animatedValue, setAnimatedValue] = useState(0)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const iconColorClasses = {
    red: 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }

  const changeColorClasses = {
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400'
  }

  // Animation for numbers
  useEffect(() => {
    if (typeof value === 'number' && !loading) {
      setShouldAnimate(true)
      const timer = setTimeout(() => {
        let start = 0
        const end = value
        const duration = 1000
        const startTime = Date.now()

        const updateValue = () => {
          const now = Date.now()
          const progress = Math.min((now - startTime) / duration, 1)
          const easedProgress = 1 - Math.pow(1 - progress, 3) // ease-out cubic
          const current = Math.floor(start + (end - start) * easedProgress)
          
          setAnimatedValue(current)
          
          if (progress < 1) {
            requestAnimationFrame(updateValue)
          }
        }
        
        requestAnimationFrame(updateValue)
      }, 200)

      return () => clearTimeout(timer)
    }
  }, [value, loading])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="skeleton h-4 w-24 mb-3"></div>
            <div className="skeleton h-8 w-16 mb-3"></div>
            <div className="skeleton h-3 w-20"></div>
          </div>
          <div className="skeleton w-12 h-12 rounded-lg"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 hover-lift stats-glow group">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 transition-colors">
            {typeof value === 'number' && shouldAnimate ? animatedValue : value}
          </p>
          {change && (
            <p className={`text-sm flex items-center space-x-1 space-x-reverse ${changeColorClasses[changeType]}`}>
              {changeType === 'positive' && <span>↗</span>}
              {changeType === 'negative' && <span>↘</span>}
              <span>{change}</span>
            </p>
          )}
        </div>
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 
          group-hover:scale-110 group-hover:rotate-3 
          ${iconColorClasses[iconColor]}
        `}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  )
}