'use client'

import { useEffect, useState } from 'react'
import { useTenantRouter } from '@/app/lib/tenant-router'
import { apiFetch, redirectToLogin } from '@/app/lib/api'
import { PageLoader } from '@/app/components/ui/PageLoader'
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Users,
    Calendar,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Clock
} from 'lucide-react'

type DashboardStats = {
    today: {
        total: number
        orders: number
        avgTicket: number
        tables: number
        closedTables: number
    }
    week: {
        total: number
        orders: number
        avgTicket: number
        closedTables: number
    }
    month: {
        total: number
        orders: number
        avgTicket: number
        closedTables: number
    }
    hourlySales: Array<{
        hour: string
        total: number
    }>
    comparison: {
        todayVsYesterday: number
        weekVsLastWeek: number
    }
}

export default function DashboardPage() {
    const router = useTenantRouter()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')

    useEffect(() => {
        const init = async () => {
            try {
                const meData = await apiFetch<{ user?: { permissions?: string[] } }>('/auth/me')
                if (!meData.user) {
                    redirectToLogin()
                    return
                }

                if (!meData.user.permissions?.includes('relatorios.visualizar')) {
                    router.replace('/')
                    return
                }

                const data = await apiFetch<DashboardStats>('/dashboard/stats')
                setStats(data)
            } catch (err) {
                console.error('Error loading dashboard:', err)
            } finally {
                setLoading(false)
            }
        }

        init()
    }, [router])

    if (loading) {
        return <PageLoader message="Carregando dashboard" detail="Atualizando vendas e operação" />
    }

    const currentStats = stats ? stats[period] : null
    const maxHourlySale = stats ? Math.max(...stats.hourlySales.map(h => h.total), 1) : 1

    const metrics = [
        { label: 'Vendas', value: `R$ ${currentStats?.total.toFixed(2).replace('.', ',') || '0,00'}`, icon: DollarSign },
        { label: 'Pedidos', value: String(currentStats?.orders || 0), icon: ShoppingCart },
        { label: 'Ticket médio', value: `R$ ${currentStats?.avgTicket.toFixed(2).replace('.', ',') || '0,00'}`, icon: TrendingUp },
        { label: 'Mesas atendidas hoje', value: String(stats?.today.tables || 0), icon: Users },
    ]

    const comparison = stats?.comparison.todayVsYesterday ?? 0

    return (
        <main className="min-h-screen bg-[#f5f6f8] px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Operação</p>
                        <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-slate-950 sm:text-3xl">Resumo do negócio</h1>
                        <p className="mt-1 text-sm text-slate-600">Vendas e atendimento em uma leitura direta.</p>
                    </div>
                    <div className="inline-flex self-start rounded-lg border border-slate-300 bg-white p-1" role="group" aria-label="Período do resumo">
                        {(['today', 'week', 'month'] as const).map((p) => (
                            <button
                                type="button"
                                key={p}
                                onClick={() => setPeriod(p)}
                                aria-pressed={period === p}
                                className={`min-h-9 rounded-md px-4 text-sm font-semibold transition-colors ${period === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                            >
                                {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
                            </button>
                        ))}
                    </div>
                </header>

                <section className="grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores principais">
                    {metrics.map(({ label, value, icon: Icon }, index) => (
                        <article key={label} className={`p-5 ${index > 0 ? 'border-t border-slate-200 sm:border-l sm:border-t-0' : ''} ${index === 2 ? 'sm:border-l-0 sm:border-t lg:border-l lg:border-t-0' : ''}`}>
                            <div className="flex items-center justify-between gap-3">
                                <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700"><Icon size={18} aria-hidden="true" /></span>
                                {index === 0 && period === 'today' && (
                                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${comparison >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {comparison >= 0 ? <ArrowUpRight size={15} aria-hidden="true" /> : <ArrowDownRight size={15} aria-hidden="true" />}
                                        {Math.abs(comparison)}% <span className="font-medium text-slate-500">vs. ontem</span>
                                    </span>
                                )}
                            </div>
                            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums tracking-[-0.025em] text-slate-950">{value}</p>
                        </article>
                    ))}
                </section>

                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                        <div className="mb-6 flex items-center justify-between gap-4">
                            <div>
                                <h2 className="flex items-center gap-2 text-base font-bold text-slate-950"><BarChart3 size={18} className="text-orange-600" aria-hidden="true" /> Vendas por hora</h2>
                                <p className="mt-1 text-sm text-slate-500">Movimento registrado no dia atual.</p>
                            </div>
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><Calendar size={15} aria-hidden="true" /> Hoje</span>
                        </div>
                        <div className="flex h-52 items-end justify-between gap-2 border-b border-slate-200" aria-label="Gráfico de vendas por hora">
                            {stats?.hourlySales.map((hour) => (
                                <div key={hour.hour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                                    <div className="w-full max-w-8 rounded-t bg-orange-500 transition-colors hover:bg-orange-600" style={{ height: `${(hour.total / maxHourlySale) * 100}%`, minHeight: hour.total > 0 ? '6px' : '0px' }} title={`R$ ${hour.total.toFixed(2)}`} />
                                    <span className="pb-2 text-[11px] font-medium text-slate-500">{hour.hour}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <aside className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-300">Leitura rápida</p>
                        <div className="mt-5 space-y-5">
                            <div>
                                <span className="flex items-center gap-2 text-sm text-slate-300"><TrendingUp size={16} aria-hidden="true" /> Crescimento semanal</span>
                                <strong className="mt-1 block text-2xl tabular-nums">{stats ? `${stats.comparison.weekVsLastWeek >= 0 ? '+' : ''}${stats.comparison.weekVsLastWeek}%` : '—'}</strong>
                            </div>
                            <div className="border-t border-slate-700 pt-5">
                                <span className="flex items-center gap-2 text-sm text-slate-300"><Clock size={16} aria-hidden="true" /> Mesas fechadas hoje</span>
                                <strong className="mt-1 block text-2xl tabular-nums">{stats?.today.closedTables ?? 0}</strong>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    )
}
