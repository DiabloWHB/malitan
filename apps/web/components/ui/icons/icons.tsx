import { LucideIcon } from 'lucide-react'

// Import כל האייקונים שנצטרך
import {
  LayoutDashboard,
  Ticket,
  Building,
  ArrowUpDown,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Search,
  Bell,
  Moon,
  Sun,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  User,
  Clock,
  Paperclip,
  PlusCircle,
  Building2,
  TrendingUp,
  Menu,
  X,
  ChevronRight,
  Settings,
  LogOut
} from 'lucide-react'

// Export מאורגן של כל האייקונים
export {
  LayoutDashboard,
  Ticket,
  Building,
  ArrowUpDown,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Search,
  Bell,
  Moon,
  Sun,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  User,
  Clock,
  Paperclip,
  PlusCircle,
  Building2,
  TrendingUp,
  Menu,
  X,
  ChevronRight,
  Settings,
  LogOut
}

// טיפוס לאייקון
export type IconType = LucideIcon

// קומפוננט עוטף לאייקונים
interface IconProps {
  icon: IconType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Icon({ icon: IconComponent, size = 'md', className = '' }: IconProps) {
  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }[size]

  return <IconComponent className={`${sizeClass} ${className}`} />
}