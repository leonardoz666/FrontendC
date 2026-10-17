'use client'

import { RefreshCw, WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f4f1ea] px-6 text-slate-950">
      <section className="w-full max-w-md text-center" role="status" aria-live="polite">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#172033] text-white shadow-[0_16px_35px_rgba(23,32,51,.18)]">
          <WifiOff size={29} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.03em]">Sem conexão no momento</h1>
        <p className="mt-3 leading-7 text-slate-600">Não foi possível carregar esta tela pela rede. Verifique sua internet e tente novamente.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(234,88,12,.2)] hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
        >
          <RefreshCw size={18} aria-hidden="true" /> Tentar novamente
        </button>
      </section>
    </main>
  )
}
