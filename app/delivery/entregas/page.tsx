"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bike,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  TriangleAlert,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { useToast } from "@/contexts/ToastContext";

type Delivery = {
  id: number;
  status: "PRONTO" | "EM_ENTREGA";
  nomeDestinatario: string;
  telefone: string;
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string | null;
  total: number;
  criadoEm: string;
  requerCodigo: boolean;
};
type Portal = {
  motoboy: { id: number; nome: string; status: string };
  orders: Delivery[];
};

export default function DeliveryPortalPage() {
  const { showToast } = useToast();
  const [portal, setPortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [occurrenceId, setOccurrenceId] = useState<number | null>(null);
  const [occurrence, setOccurrence] = useState("");
  const [confirming, setConfirming] = useState<Delivery | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPortal(await apiFetch<Portal>("/delivery/portal"));
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar as entregas.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  useEffect(() => {
    void load();
  }, [load]);

  const transition = async (order: Delivery, codigoEntrega?: string) => {
    if (order.status === "EM_ENTREGA" && order.requerCodigo && !codigoEntrega) {
      setConfirming(order);
      return;
    }
    setBusyId(order.id);
    try {
      await apiFetch(`/delivery/portal/orders/${order.id}/transition`, {
        method: "POST",
        body: {
          status: order.status === "PRONTO" ? "EM_ENTREGA" : "ENTREGUE",
          codigoEntrega,
        },
      });
      setConfirming(null);
      setConfirmationCode("");
      await load();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a entrega.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };
  const report = async () => {
    if (!occurrenceId || !occurrence.trim()) return;
    setBusyId(occurrenceId);
    try {
      await apiFetch(`/delivery/portal/orders/${occurrenceId}/occurrences`, {
        method: "POST",
        body: { tipo: "OCORRENCIA", descricao: occurrence },
      });
      showToast("Ocorrência registrada.", "success");
      setOccurrenceId(null);
      setOccurrence("");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a ocorrência.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !portal)
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <LoaderCircle className="animate-spin text-orange-500" />
      </main>
    );
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-300">
              Rota de {portal?.motoboy.nome}
            </p>
            <h1 className="text-3xl font-black">Minhas entregas</h1>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-600">
            <Bike />
          </span>
        </header>
        <div className="space-y-4">
          {portal?.orders.map((order, index) => (
            <article
              key={order.id}
              className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl"
            >
              <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <span className="text-xs font-black text-orange-600">
                    PARADA {index + 1}
                  </span>
                  <h2 className="text-lg font-black">
                    {order.nomeDestinatario}
                  </h2>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${order.status === "EM_ENTREGA" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {order.status === "EM_ENTREGA"
                    ? "Em rota"
                    : "Pronto para retirar"}
                </span>
              </header>
              <div className="space-y-3 p-5">
                <p className="flex gap-2 text-sm">
                  <MapPin className="shrink-0 text-orange-600" size={18} />
                  <span>
                    <strong className="block">
                      {order.logradouro}, {order.numero || "s/n"}
                    </strong>
                    {order.complemento && (
                      <span>
                        {order.complemento}
                        <br />
                      </span>
                    )}
                    {order.bairro} · {order.cidade}/{order.uf}
                    {order.referencia && (
                      <span className="mt-1 block text-slate-500">
                        Referência: {order.referencia}
                      </span>
                    )}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Phone size={18} className="text-orange-600" />{" "}
                  {order.telefone}
                </p>
                <p className="text-right text-lg font-black">
                  Cobrar{" "}
                  {Number(order.total).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
              </div>
              <footer className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50 p-4">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.logradouro}, ${order.numero || ""}, ${order.bairro}, ${order.cidade}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-black text-slate-700"
                >
                  <Navigation size={17} /> Abrir rota
                </a>
                <button
                  type="button"
                  onClick={() => void transition(order)}
                  disabled={busyId === order.id}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 text-sm font-black text-white disabled:opacity-50"
                >
                  {busyId === order.id ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  {order.status === "PRONTO"
                    ? "Retirei pedido"
                    : "Confirmar entrega"}
                </button>
                <button
                  type="button"
                  onClick={() => setOccurrenceId(order.id)}
                  className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-bold text-red-700 hover:bg-red-50"
                >
                  <TriangleAlert size={16} /> Registrar ocorrência
                </button>
              </footer>
            </article>
          ))}
          {portal?.orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-700 px-5 py-16 text-center">
              <Bike className="mx-auto mb-3 text-slate-600" size={36} />
              <strong className="block">Nenhuma entrega atribuída</strong>
              <span className="mt-1 block text-sm text-slate-400">
                Novas rotas aparecerão aqui quando forem despachadas.
              </span>
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirmation-code-title"
        >
          <section className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900">
            <h2 id="confirmation-code-title" className="text-xl font-black">
              Código de recebimento
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Peça ao cliente o código de 6 dígitos exibido no acompanhamento.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              value={confirmationCode}
              onChange={(event) =>
                setConfirmationCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              maxLength={6}
              placeholder="000000"
              className="mt-4 h-14 w-full rounded-xl border border-slate-300 text-center text-2xl font-black tracking-[0.3em] outline-none focus:border-orange-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(null);
                  setConfirmationCode("");
                }}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void transition(confirming, confirmationCode)}
                disabled={
                  confirmationCode.length !== 6 || busyId === confirming.id
                }
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                Confirmar entrega
              </button>
            </div>
          </section>
        </div>
      )}
      {occurrenceId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900">
            <h2 className="text-xl font-black">Registrar ocorrência</h2>
            <p className="mt-1 text-sm text-slate-500">
              Descreva tentativa, recusa, endereço não localizado ou outro
              problema.
            </p>
            <textarea
              autoFocus
              value={occurrence}
              onChange={(event) => setOccurrence(event.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-orange-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOccurrenceId(null)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-black"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void report()}
                disabled={!occurrence.trim() || busyId === occurrenceId}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                Registrar ocorrência
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
