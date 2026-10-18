'use client'
/* eslint-disable @next/next/no-img-element -- a marca do tenant pode ser uma data URL */

import Link from '@/app/components/TenantLink'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Armchair,
  Bike,
  Boxes,
  CalendarDays,
  Camera,
  ChartColumn,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Contact,
  Eye,
  FileSpreadsheet,
  FileText,
  HardDrive,
  History,
  Landmark,
  LayoutDashboard,
  ListTree,
  LogOut,
  MapPin,
  Package,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Printer,
  QrCode,
  Scale,
  Search,
  Settings,
  Shield,
  Tags,
  Target,
  Truck,
  UserCog,
  Users,
  UtensilsCrossed,
  Wallet,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch, redirectToLogin } from '@/app/lib/api'
import { ThemeToggle } from '@/app/components/ui/ThemeToggle'
import {
  buildSidebarVisualSections,
  findActiveNavItem,
  readStoredCollapsed,
  readStoredSidebarVisibility,
  SIDEBAR_VISIBILITY_EVENT,
  sidebarVisibilityStorageKey,
  visibleNavGroups,
  writeStoredCollapsed,
  type NavIconName,
  type NavItem,
  type NavUser,
} from '@/app/lib/navigation'
import { useBranding } from '@/app/contexts/BrandingContext'
import { operationalPathname } from '@/app/lib/tenant-navigation'

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  Activity,
  LayoutDashboard,
  ChartColumn,
  Armchair,
  ClipboardList,
  Users,
  Tags,
  Contact,
  Wallet,
  Truck,
  UtensilsCrossed,
  Package,
  FileSpreadsheet,
  Boxes,
  History,
  ClipboardCheck,
  PackageSearch,
  Clock,
  Camera,
  CalendarDays,
  Pencil,
  Shield,
  Landmark,
  Bike,
  FileText,
  Settings,
  UserCog,
  Printer,
  Target,
  Warehouse,
  ListTree,
  MapPin,
  HardDrive,
  QrCode,
  Eye,
  Scale,
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  /** Usuário já carregado pelo MainLayout (evita uma segunda chamada a `/api/auth/me`). */
  user?: NavUser | null
  establishmentName?: string
  /** Estado recolhido (rail de ícones) controlado pelo MainLayout. */
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({
  isOpen,
  onClose,
  user: userProp,
  establishmentName = 'Estabelecimento',
  collapsed: collapsedProp,
  onToggleCollapse,
}: SidebarProps) {
  const { branding } = useBranding()
  const pathname = operationalPathname(usePathname())
  const [fetchedUser, setFetchedUser] = useState<NavUser | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selfCollapsed, setSelfCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [visibility, setVisibility] = useState(() => readStoredSidebarVisibility(null))
  const activeSectionRef = useRef<string | undefined>(undefined)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isOpen) onClose()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // O MainLayout já busca o usuário; a busca própria só roda no uso avulso da Sidebar.
  useEffect(() => {
    if (userProp !== undefined) return
    let cancelled = false
    apiFetch<{ user?: NavUser }>('/auth/me', { redirectOn401: false })
      .then(data => {
        if (!cancelled && data?.user) setFetchedUser(data.user)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [userProp])

  const user = userProp !== undefined ? userProp : fetchedUser
  const isWaiter = user?.role === 'GARCOM'
  const isStockkeeper = user?.role === 'ESTOQUISTA'

  const visibleGroups = useMemo(() => visibleNavGroups(user)
    .map(({ group, items }) => ({
      group,
      items: items.filter(item => !item.module || branding.modulosAtivos.includes(item.module)),
    }))
    .filter(({ items }) => items.length > 0), [branding.modulosAtivos, user])
  const active = useMemo(() => findActiveNavItem(pathname), [pathname])
  const activeHref = active?.item.href
  const quickShortcuts = user?.role === 'GARCOM'
    ? [
        { href: '/', label: 'Início' },
        { href: '/mesas', label: 'Mapa de Mesas' },
        { href: '/minhas-mesas', label: 'Minhas Mesas' },
      ]
    : [
        { href: '/', label: 'Início' },
        { href: '/mesas', label: 'Mesas' },
        { href: '/admin', label: 'Painel' },
      ]
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return visibleGroups
    return visibleGroups
      .map(({ group, items }) => {
        const groupMatches = group.label.toLowerCase().includes(normalizedSearch)
        const filteredItems = groupMatches
          ? items
          : items.filter(item => item.label.toLowerCase().includes(normalizedSearch))
        return { group, items: filteredItems }
      })
      .filter(({ items }) => items.length > 0)
  }, [normalizedSearch, visibleGroups])
  const visualSections = useMemo(() => {
    const sourceGroups = normalizedSearch ? filteredGroups : visibleGroups
    const hiddenSections = new Set(visibility.hiddenSectionIds)
    const hiddenItems = new Set(visibility.hiddenItemHrefs)

    return buildSidebarVisualSections(sourceGroups, isWaiter)
      .filter(section => !hiddenSections.has(section.id))
      .map(section => {
        const groups = section.groups
          .map(group => ({ ...group, items: group.items.filter(item => !hiddenItems.has(item.href)) }))
          .filter(group => group.items.length > 0)
        return { ...section, groups, items: groups.flatMap(group => group.items) }
      })
      .filter(section => section.items.length > 0)
  }, [filteredGroups, isWaiter, normalizedSearch, visibility, visibleGroups])
  const dashboardItem = useMemo(() => {
    if (visibility.hiddenItemHrefs.includes('/dashboard')) return null
    const sourceGroups = normalizedSearch ? filteredGroups : visibleGroups
    return sourceGroups.flatMap(({ items }) => items).find(item => item.href === '/dashboard') ?? null
  }, [filteredGroups, normalizedSearch, visibility.hiddenItemHrefs, visibleGroups])

  useEffect(() => {
    if (!user) return
    const syncVisibility = () => setVisibility(readStoredSidebarVisibility(user))
    const handleStorage = (event: StorageEvent) => {
      if (event.key === sidebarVisibilityStorageKey(user)) syncVisibility()
    }

    syncVisibility()
    window.addEventListener(SIDEBAR_VISIBILITY_EVENT, syncVisibility)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(SIDEBAR_VISIBILITY_EVENT, syncVisibility)
      window.removeEventListener('storage', handleStorage)
    }
  }, [user])

  const visualSectionForActive = useMemo(
    () => visualSections.find(section => section.items.some(item => item.href === activeHref)),
    [activeHref, visualSections]
  )
  const activeSectionId = visualSectionForActive?.id
  const roleLabel = user?.role?.replaceAll('_', ' ').toLocaleLowerCase('pt-BR')

  useEffect(() => {
    if (!activeSectionId || activeSectionRef.current === activeSectionId) return
    activeSectionRef.current = activeSectionId
    setOpenGroups(prev => {
      if (!(activeSectionId in prev)) return prev
      const next = { ...prev }
      delete next[activeSectionId]
      return next
    })
  }, [activeSectionId])

  // Fallback de colapso/persistência quando a Sidebar é usada fora do MainLayout.
  useEffect(() => {
    if (collapsedProp !== undefined) return
    setSelfCollapsed(readStoredCollapsed(user))
  }, [collapsedProp, user])

  const isCollapsed = collapsedProp !== undefined ? collapsedProp : selfCollapsed

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse()
      return
    }
    setSelfCollapsed(prev => {
      const next = !prev
      writeStoredCollapsed(user, next)
      return next
    })
  }

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => {
      const isOpenNow = prev[groupId] ?? groupId === activeSectionId
      return { ...prev, [groupId]: !isOpenNow }
    })
  }

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      redirectToLogin()
    }
  }

  const renderItem = (item: NavItem, standalone = false) => {
    const Icon = NAV_ICONS[item.icon]

    if (item.disabled) {
      return (
        <div
          key={item.href}
          aria-disabled="true"
          title={`${item.label} — em breve`}
          className={`sidebar-muted flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium opacity-55 cursor-not-allowed select-none ${
            isCollapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          <Icon size={18} className="shrink-0" aria-hidden="true" />
          <span className={`flex-1 truncate ${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
          <span
            className={`sidebar-surface-strong rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isCollapsed ? 'md:hidden' : ''
            }`}
          >
            em breve
          </span>
        </div>
      )
    }

    const isActive = item.href === activeHref

    return (
      <Link
        key={item.href}
        href={item.href}
        title={item.label}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] leading-5 transition-[background-color,color] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-primary)] ${
          standalone ? 'font-semibold' : 'font-medium'
        } ${
          isActive
            ? 'bg-[var(--brand-accent)] font-semibold text-[var(--brand-on-accent)]'
            : 'sidebar-text hover:bg-[var(--sidebar-surface-hover)]'
        } ${isCollapsed ? 'md:justify-center md:px-0' : ''}`}
      >
        <Icon
          size={18}
          strokeWidth={standalone ? 2.25 : 2}
          className="shrink-0"
          aria-hidden="true"
        />
        <span className={`flex-1 truncate ${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
        {item.shortcut && (
          <kbd
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${
              isActive ? 'border-white/40 bg-white/15 text-white' : 'sidebar-muted border-[var(--sidebar-border)] group-hover:text-[var(--sidebar-text)]'
            } ${isCollapsed ? 'md:hidden' : ''}`}
          >
            {item.shortcut}
          </kbd>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/55 transition-opacity md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        controlae-navigation fixed inset-y-0 left-0 z-[70] flex w-[min(86vw,272px)] flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-background)] transition-[transform,width] duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:w-[76px]' : 'md:w-[272px]'}
        md:translate-x-0
      `}>
        {!isStockkeeper && (!visibility.hideBrand || !visibility.hideSearch || !visibility.hideShortcuts) && (
        <div
          className={`border-b border-[var(--sidebar-border)] bg-[var(--sidebar-header)] px-3.5 py-3 ${
            isCollapsed ? `md:px-2 ${visibility.hideBrand ? 'md:hidden' : ''}` : ''
          }`}
        >
          {!visibility.hideBrand && (
          <div className={`flex min-h-12 items-center justify-between gap-3 ${isCollapsed ? 'md:flex-col md:justify-center md:gap-2' : ''}`}>
            <div className={`flex min-w-0 items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[var(--brand-primary)] text-xl font-bold text-[var(--brand-on-primary)]">
                {branding.logoCompactaUrl || branding.logoUrl ? <img src={branding.logoCompactaUrl || branding.logoUrl} alt="" className="h-full w-full object-contain p-1" /> : branding.nomeExibicao.charAt(0).toUpperCase()}
              </div>
              <div className={`min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
                <span className="sidebar-text block truncate text-base font-bold leading-tight">
                  {branding.nomeExibicao || establishmentName}
                </span>
                <span className="sidebar-muted mt-0.5 block truncate text-xs font-medium">Central da operação</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              className="sidebar-icon-button hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors md:flex"
            >
              {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar menu"
              className="sidebar-icon-button flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
            >
              <X size={19} />
            </button>
          </div>
          )}

          {!visibility.hideSearch && (
          <div className={`${visibility.hideBrand ? '' : 'mt-3'} ${isWaiter ? 'hidden' : isCollapsed ? 'md:hidden' : ''}`}>
            <label className="sidebar-field flex h-10 items-center gap-2.5 rounded-[10px] border px-3 transition-[border-color,box-shadow]">
              <Search size={16} className="sidebar-muted shrink-0" aria-hidden="true" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-[13px] font-medium outline-none"
                placeholder="Buscar módulo ou ação"
                type="search"
              />
            </label>
          </div>
          )}

          {!visibility.hideShortcuts && (
          <div className={`${visibility.hideBrand && visibility.hideSearch ? '' : 'mt-2'} grid grid-cols-3 gap-1 ${isWaiter ? 'grid-cols-1' : ''} ${isCollapsed ? 'md:hidden' : ''}`}>
            {quickShortcuts.map(shortcut => {
              const activeShortcut = pathname === shortcut.href
              return (
                <Link
                  key={shortcut.href}
                  href={shortcut.href}
                  title={shortcut.label}
                  aria-current={activeShortcut ? 'page' : undefined}
                  className={`flex min-h-9 min-w-0 items-center justify-center rounded-lg px-2 text-center text-[11px] font-semibold leading-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand-primary)] ${
                    activeShortcut
                      ? 'bg-[var(--brand-accent)] text-[var(--brand-on-accent)]'
                      : 'sidebar-muted hover:bg-[var(--sidebar-surface-hover)] hover:text-[var(--sidebar-text)]'
                  }`}
                >
                  {shortcut.label}
                </Link>
              )
            })}
          </div>
          )}
        </div>
        )}

        <nav aria-label="Navegação principal" className={`flex-1 overflow-y-auto overscroll-contain px-3 py-3 [scrollbar-width:thin] ${isCollapsed ? 'md:px-2.5' : ''}`}>
          {filteredGroups.length === 0 && (
            <div className={`sidebar-surface sidebar-muted rounded-xl border border-dashed px-3 py-4 text-center text-sm font-medium ${isCollapsed ? 'md:hidden' : ''}`}>
              Nenhum módulo encontrado
            </div>
          )}

          {isCollapsed && (
            <div className="hidden space-y-1 md:block">
              {dashboardItem && renderItem(dashboardItem, true)}
              {visualSections.flatMap(section => section.items).map(item => renderItem(item))}
            </div>
          )}

          {dashboardItem && (
            <div className={`mb-2 ${isCollapsed ? 'md:hidden' : ''}`}>
              {renderItem(dashboardItem, true)}
            </div>
          )}

          {visualSections.map(section => {
            const isGroupActive = section.id === activeSectionId
            const isGroupOpen = Boolean(normalizedSearch) || (openGroups[section.id] ?? isGroupActive)

            return (
              <div key={section.id} className={`mb-1 ${isCollapsed ? 'md:hidden' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleGroup(section.id)}
                  aria-expanded={isGroupOpen}
                  title={section.label}
                  className={`sidebar-section-trigger flex min-h-9 w-full items-center rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand-primary)] ${isGroupActive ? 'sidebar-text' : 'sidebar-muted'}`}
                >
                  <span className="flex-1 truncate text-left">{section.label.charAt(0) + section.label.slice(1).toLocaleLowerCase('pt-BR')}</span>
                  <ChevronDown
                    size={14}
                    strokeWidth={2.5}
                    className={`shrink-0 transition-transform duration-200 ${isGroupOpen ? '' : '-rotate-90'}`}
                  />
                </button>

                <div className={isGroupOpen ? 'mt-0.5 space-y-0.5' : 'hidden'}>
                  {section.groups.map((group, index) => (
                    <div key={group.id} className={index > 0 ? 'mt-1 pt-1' : ''}>
                      <div className="space-y-0.5">
                        {group.items.map(item => renderItem(item))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

        </nav>

        <div className="border-t border-[var(--sidebar-border)] bg-[var(--sidebar-footer)] p-2.5">
          <div
            className={`flex items-center justify-between gap-2 rounded-xl p-1.5 ${
              isCollapsed ? 'md:flex-col md:justify-center' : ''
            }`}
          >
            <div className={`flex items-center space-x-3 overflow-hidden ${isCollapsed ? 'md:space-x-0' : ''}`}>
              <div
                title={user?.name ?? undefined}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-primary)] text-sm font-bold text-[var(--brand-on-primary)]"
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
                <p className="sidebar-text text-sm font-semibold truncate leading-tight">{user?.name}</p>
                <p className="sidebar-muted mt-0.5 truncate text-xs font-medium capitalize">{roleLabel}</p>
              </div>
            </div>

            <div className={`flex shrink-0 items-center gap-1 ${isCollapsed ? 'md:flex-col' : ''}`}>
              <ThemeToggle compact className="sidebar-icon-button sidebar-surface" />
              {visibility.hideBrand && (
                <button
                  type="button"
                  onClick={handleToggleCollapse}
                  aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                  title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                  className="sidebar-icon-button hidden rounded-xl p-2 transition-colors md:flex"
                >
                  {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="sidebar-icon-button rounded-xl p-2 transition-colors hover:!bg-red-50 hover:!text-red-600"
                title="Sair"
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

      </aside>
    </>
  )
}
