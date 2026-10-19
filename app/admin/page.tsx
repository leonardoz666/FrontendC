'use client'

import Link from '@/app/components/TenantLink'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/app/lib/api'
import { ConfirmationModal } from '@/app/components/ConfirmationModal'
import { useToast } from '@/contexts/ToastContext'
import { 
  AlertTriangle,
  Database,
  UtensilsCrossed, 
  Users, 
  Tags, 
  Printer,
  ClipboardList,
  Eye,
  History,
  ShieldCheck,
  LockKeyhole,
  Trash2,
} from 'lucide-react'

export default function AdminDashboard() {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [modalResetAberto, setModalResetAberto] = useState(false)
  const [senhaDono, setSenhaDono] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [resetando, setResetando] = useState(false)
  const { data: sessao } = useQuery({
    queryKey: ['auth-me'],
    queryFn: () => apiFetch<{ user?: { role?: string } }>('/auth/me'),
  })
  const isOwner = sessao?.user?.role === 'DONO'

  const adminLinks = [
    {
      href: '/admin/produtos',
      label: 'Produtos',
      description: 'Gerenciar cardápio e itens',
      icon: UtensilsCrossed,
      color: 'bg-orange-100 text-orange-700'
    },
    {
      href: '/admin/categorias',
      label: 'Categorias',
      description: 'Organizar setores e tipos',
      icon: Tags,
      color: 'bg-slate-100 text-slate-700'
    },
    {
      href: '/admin/usuarios',
      label: 'Usuários',
      description: 'Gerenciar equipe e permissões',
      icon: Users,
      color: 'bg-slate-100 text-slate-700'
    },
    {
      href: '/admin/impressoras',
      label: 'Impressoras',
      description: 'Configurar impressão de pedidos',
      icon: Printer,
      color: 'bg-slate-100 text-slate-700'
    },
    {
      href: '/admin/comandas',
      label: 'Comandas',
      description: 'Personalizar pedidos, parciais e fechamentos',
      icon: ClipboardList,
      color: 'bg-slate-100 text-slate-700'
    },
    {
      href: '/admin/visibilidade',
      label: 'Visibilidade',
      description: 'Escolher o que aparece na barra lateral',
      icon: Eye,
      color: 'bg-slate-100 text-slate-700'
    },
    {
      href: '/admin/atividades',
      label: 'Atividades',
      description: 'Consultar ações, pedidos e cancelamentos por assunto',
      icon: ShieldCheck,
      color: 'bg-slate-100 text-slate-700'
    }
  ]

  const fecharModalReset = () => {
    if (resetando) return
    setModalResetAberto(false)
    setSenhaDono('')
    setConfirmacao('')
  }

  const resetarBanco = async () => {
    if (resetando) return
    if (confirmacao !== 'RESETAR BANCO') {
      showToast('Digite exatamente RESETAR BANCO para confirmar', 'warning')
      return
    }
    if (!senhaDono.trim()) {
      showToast('Informe sua senha de dono', 'warning')
      return
    }

    setResetando(true)
    try {
      const result = await apiFetch<{ tabelasLimpas: number; usuariosExcluidos: number }>('/system/reset-database', {
        method: 'POST',
        body: { senhaDono, confirmacao },
      })
      queryClient.clear()
      setModalResetAberto(false)
      setSenhaDono('')
      setConfirmacao('')
      showToast(`Banco resetado: ${result.tabelasLimpas} tabela(s) limpa(s) e ${result.usuariosExcluidos} usuário(s) removido(s)`, 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível resetar o banco de dados', 'error')
    } finally {
      setResetando(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] p-4 sm:p-6 lg:p-8">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700">Configuração</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] text-slate-950">Painel administrativo</h1>
        <p className="mt-1 text-sm text-slate-600">Cadastros e regras que sustentam a operação.</p>
      </header>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {adminLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className="block group"
            >
              <div className="h-full rounded-xl border border-slate-200 bg-white p-5 transition-colors duration-150 group-hover:border-orange-300 group-hover:bg-orange-50/40">
                <div className={`${link.color} mb-4 flex h-10 w-10 items-center justify-center rounded-lg`}>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h2 className="mb-1 text-base font-bold text-slate-900">{link.label}</h2>
                <p className="text-sm leading-5 text-slate-500">{link.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {isOwner && (
        <section className="mt-8 rounded-xl border-2 border-red-300 bg-red-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div className="h-fit rounded-full bg-red-100 p-2.5 text-red-700"><Database size={22} /></div>
              <div>
                <h2 className="font-bold text-red-950">Resetar banco de dados</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-red-800">
                  Apaga cardápio, pedidos, mesas, estoque, caixa, cadastros e demais dados operacionais. Somente este usuário DONO será preservado.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalResetAberto(true)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-800"
            >
              <Trash2 size={17} />
              Resetar banco
            </button>
          </div>
        </section>
      )}

      <ConfirmationModal
        isOpen={modalResetAberto}
        onClose={fecharModalReset}
        onConfirm={() => void resetarBanco()}
        title="Resetar todo o banco?"
        description="Esta ação é permanente e não pode ser desfeita. Todos os dados operacionais e todos os outros usuários serão apagados. Apenas o seu usuário DONO permanecerá cadastrado."
        confirmText={resetando ? 'Resetando...' : 'Resetar banco'}
        cancelText="Cancelar"
        variant="danger"
        closeOnConfirm={false}
        isLoading={resetando}
      >
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <strong>Não use esta opção apenas para esconder produtos. O sistema inteiro voltará vazio.</strong>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-gray-800">Digite RESETAR BANCO</span>
          <input
            value={confirmacao}
            onChange={event => setConfirmacao(event.target.value)}
            disabled={resetando}
            autoComplete="off"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
            placeholder="RESETAR BANCO"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-gray-800">
            <LockKeyhole className="h-4 w-4" />
            Sua senha de dono
          </span>
          <input
            type="password"
            value={senhaDono}
            onChange={event => setSenhaDono(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void resetarBanco()
              }
            }}
            disabled={resetando}
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-950 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 disabled:bg-gray-100"
            placeholder="Digite sua senha"
          />
        </label>
      </ConfirmationModal>
    </main>
  )
}
