'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  Clock,
  ReceiptText,
  FolderOpen,
  LogOut,
  ChevronDown,
  Building2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/hooks/useProfile'
import { getInitials } from '@/lib/utils'
import type { UserRole } from '@/types/database'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: UserRole[]
  children?: { label: string; href: string; roles?: UserRole[] }[]
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Clients',
    href: '/clients',
    icon: Users,
    roles: ['admin', 'manager', 'surveyor', 'site_engineer', 'accountant'],
  },
  {
    label: 'Jobs',
    href: '/jobs',
    icon: Briefcase,
    children: [
      { label: 'Survey Jobs', href: '/jobs/survey', roles: ['admin', 'manager', 'surveyor', 'accountant'] },
      { label: 'Construction Jobs', href: '/jobs/construction', roles: ['admin', 'manager', 'site_engineer', 'accountant'] },
    ],
  },
  {
    label: 'Equipment',
    href: '/equipment',
    icon: Package,
    roles: ['admin', 'manager', 'surveyor', 'site_engineer'],
  },
  { label: 'Timesheets', href: '/timesheets', icon: Clock },
  {
    label: 'Finance',
    href: '/finance',
    icon: ReceiptText,
    roles: ['admin', 'manager', 'accountant'],
    children: [
      { label: 'Quotations', href: '/finance/quotations' },
      { label: 'Invoices', href: '/finance/invoices' },
      { label: 'Expenses', href: '/finance/expenses' },
      { label: 'Payments', href: '/finance/payments' },
    ],
  },
  { label: 'Documents', href: '/documents', icon: FolderOpen },
]

function canSee(
  item: NavItem | { label: string; href: string; roles?: UserRole[] },
  role: UserRole
) {
  if (!item.roles) return true
  return item.roles.includes(role)
}

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useProfile()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose?.()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'flex flex-col w-64 bg-gray-900 text-white',
          'fixed inset-y-0 left-0 z-50 min-h-screen transition-transform duration-300',
          'md:relative md:translate-x-0 md:min-h-screen',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-700">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight truncate">Geo-smart</p>
            <p className="text-xs text-gray-400 truncate">Engineering</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded text-gray-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
            {NAV.map((item) => {
              if (profile && !canSee(item, profile.role)) return null

              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              if (item.children) {
                const visibleChildren = profile
                  ? item.children.filter((c) => canSee(c, profile.role))
                  : item.children
                if (visibleChildren.length === 0) return null

                return (
                  <li key={item.href}>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400',
                        isActive && 'text-white'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                      <ChevronDown className="w-3 h-3 ml-auto" />
                    </div>
                    <ul className="mt-0.5 ml-7 space-y-0.5">
                      {visibleChildren.map((child) => {
                        const childActive =
                          pathname === child.href ||
                          pathname.startsWith(child.href + '/')
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={cn(
                                'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                                childActive
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
                              )}
                            >
                              {child.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                )
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-700 px-3 py-3">
          {profile && (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-xs font-bold shrink-0">
                {getInitials(profile.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {profile.full_name}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {profile.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
