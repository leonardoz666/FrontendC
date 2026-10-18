'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, KeyRound, LoaderCircle, ShieldCheck, Smartphone } from 'lucide-react'

type State = 'waiting' | 'redeeming' | 'success' | 'error'

export default function DeviceAccessPage() {
  const params = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const [state, setState] = useState<State>('waiting')
  const [message, setMessage] = useState('')
  const invite = searchParams.get('convite') || ''
  const slug = String(params.slug || '').toLowerCase()

  useEffect(() => {
    if (!invite || !slug) return
    let cancelled = false
    const redeem = async () => {
      setState('redeeming')
      try {
        const response = await fetch('/api/device-access/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ slug, invite, deviceName: navigator.platform || 'Celular da equipe' }),
        })
        const result = await response.json().catch(() => ({})) as { error?: string; usuario?: { nome?: string } }
        if (!response.ok) throw new Error(result.error || 'Não foi possível liberar este aparelho')
        if (cancelled) return
        setState('success')
        setMessage(result.usuario?.nome ? `Acesso de ${result.usuario.nome} liberado neste aparelho.` : 'Aparelho liberado com sucesso.')
        window.setTimeout(() => window.location.replace(`/e/${slug}/login`), 1200)
      } catch (error) {
        if (cancelled) return
        setState('error')
        setMessage(error instanceof Error ? error.message : 'Não foi possível liberar este aparelho')
      }
    }
    void redeem()
    return () => { cancelled = true }
  }, [invite, slug])

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-5 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,.12)] sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
          {state === 'success' ? <CheckCircle2 size={29} /> : state === 'redeeming' ? <LoaderCircle className="animate-spin" size={29} /> : <Smartphone size={29} />}
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">Acesso da equipe</h1>
        {state === 'waiting' && !invite && <><p className="mt-3 leading-7 text-slate-600">Este é o link operacional do estabelecimento. Para liberar este celular, abra o link individual gerado pelo dono ou gerente na tela de usuários.</p><div className="mt-6 flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><KeyRound className="mt-0.5 shrink-0 text-orange-600" size={20} /><span>O código é de uso único e vincula somente este aparelho.</span></div></>}
        {state === 'redeeming' && <p className="mt-3 leading-7 text-slate-600">Validando o convite e vinculando este aparelho ao estabelecimento…</p>}
        {state === 'success' && <p className="mt-3 leading-7 text-emerald-700">{message} Abrindo o login…</p>}
        {state === 'error' && <><p className="mt-3 leading-7 text-red-700">{message}</p><p className="mt-4 text-sm leading-6 text-slate-600">Peça ao responsável para gerar um novo link. Convites expiram em 15 minutos e funcionam uma única vez.</p></>}
        <div className="mt-7 flex items-start gap-3 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0" size={17} /><span>A ativação administrativa continua exclusiva do dono. Este acesso não permite ativar outro estabelecimento.</span></div>
      </section>
    </main>
  )
}
