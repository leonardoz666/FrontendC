"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bike,
  ChefHat,
  CircleCheck,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { DeliveryAssistedOrderModal } from "./DeliveryAssistedOrderModal";

type Status =
  | "AGUARDANDO_CONFIRMACAO"
  | "CONFIRMADO"
  | "EM_PRODUCAO"
  | "PRONTO"
  | "EM_ENTREGA"
  | "ENTREGUE"
  | "RECUSADO"
  | "CANCELADO"
  | "FALHA_PAGAMENTO";
type Motoboy = { id: number; nome: string; telefone: string; status: string };
type DeliveryOrder = {
  id: number;
  status: Status;
  origem: string;
  nomeDestinatario: string;
  telefone: string;
  bairro: string;
  logradouro: string;
  numero: string | null;
  total: number;
  taxaEntrega: number;
  estimativaMin: number | null;
  agendadoPara: string | null;
  criadoEm: string;
  motoboy: Motoboy | null;
  zona: { id: number; nome: string } | null;
  cliente: { id: number; nome: string };
  comanda: {
    id: number;
    pedidos: Array<{
      itens: Array<{
        id: number;
        quantidade: number;
        produto: { nome: string };
      }>;
    }>;
  };
};

const LANES: Array<{
  status: Status;
  label: string;
  icon: typeof Clock3;
  tone: string;
}> = [
  {
    status: "AGUARDANDO_CONFIRMACAO",
    label: "Novos",
    icon: Clock3,
    tone: "border-amber-300 bg-amber-50",
  },
  {
    status: "CONFIRMADO",
    label: "Confirmados",
    icon: CircleCheck,
    tone: "border-blue-300 bg-blue-50",
  },
  {
    status: "EM_PRODUCAO",
    label: "Na cozinha",
    icon: ChefHat,
    tone: "border-orange-300 bg-orange-50",
  },
  {
    status: "PRONTO",
    label: "Prontos",
    icon: PackageCheck,
    tone: "border-emerald-300 bg-emerald-50",
  },
  {
    status: "EM_ENTREGA",
    label: "Em rota",
    icon: Bike,
    tone: "border-violet-300 bg-violet-50",
  },
];
const NEXT: Partial<Record<Status, Status>> = {
  AGUARDANDO_CONFIRMACAO: "CONFIRMADO",
  CONFIRMADO: "EM_PRODUCAO",
  EM_PRODUCAO: "PRONTO",
  PRONTO: "EM_ENTREGA",
  EM_ENTREGA: "ENTREGUE",
};
const NEXT_LABEL: Partial<Record<Status, string>> = {
  AGUARDANDO_CONFIRMACAO: "Confirmar pedido",
  CONFIRMADO: "Enviar à cozinha",
  EM_PRODUCAO: "Marcar pronto",
  PRONTO: "Iniciar entrega",
  EM_ENTREGA: "Confirmar entrega",
};

export default function DeliveryMonitorPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState<DeliveryOrder | null>(null);
  const [motoboyId, setMotoboyId] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [originFilter, setOriginFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [lateOnly, setLateOnly] = useState(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const filters = new URLSearchParams({ page: "1", pageSize: "100", sort: "criadoEm", order: "asc" });
        if (originFilter) filters.set("origem", originFilter);
        if (driverFilter) filters.set("motoboyId", driverFilter);
        if (lateOnly) filters.set("atraso", "true");
        const [ordersResponse, motoboysResponse] = await Promise.all([
          apiFetch<{ data: DeliveryOrder[] }>(
            `/delivery/orders?${filters.toString()}`,
          ),
          apiFetch<Motoboy[]>("/delivery/motoboys"),
        ]);
        setOrders(ordersResponse.data);
        setMotoboys(motoboysResponse);
        setUpdatedAt(new Date());
      } catch (error) {
        if (!quiet)
          showToast(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o monitor.",
            "error",
          );
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [showToast, originFilter, driverFilter, lateOnly],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const active = useMemo(
    () =>
      orders.filter((item) =>
        LANES.some((lane) => lane.status === item.status),
      ),
    [orders],
  );

  const transition = async (order: DeliveryOrder) => {
    const next = NEXT[order.status];
    if (!next) return;
    if (next === "EM_ENTREGA" && !order.motoboy) {
      setAssigning(order);
      return;
    }
    const codigoEntrega =
      next === "ENTREGUE"
        ? window.prompt("Informe o código de recebimento, se o pedido exigir:")
        : undefined;
    if (next === "ENTREGUE" && codigoEntrega === null) return;
    setBusyId(order.id);
    try {
      await apiFetch(`/delivery/orders/${order.id}/transition`, {
        method: "POST",
        body: { status: next, codigoEntrega: codigoEntrega || undefined },
      });
      await load(true);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o pedido.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };
  const assign = async () => {
    if (!assigning || !motoboyId) return;
    setBusyId(assigning.id);
    try {
      await apiFetch(`/delivery/orders/${assigning.id}/assign`, {
        method: "POST",
        body: { motoboyId: Number(motoboyId) },
      });
      await apiFetch(`/delivery/orders/${assigning.id}/transition`, {
        method: "POST",
        body: { status: "EM_ENTREGA" },
      });
      setAssigning(null);
      setMotoboyId("");
      await load(true);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível atribuir a entrega.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1700px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-950">
              Monitor de delivery
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Acompanhe o pedido da confirmação até a entrega.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {updatedAt && (
              <span>
                Atualizado às{" "}
                {updatedAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 font-black text-slate-700 hover:border-orange-400"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />{" "}
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-orange-600 px-4 font-black text-white hover:bg-orange-700"
            >
              <Plus size={16} /> Novo pedido
            </button>
          </div>
        </header>
        <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-3"><label><span className="block text-xs font-bold text-slate-500">Origem</span><select value={originFilter} onChange={event => setOriginFilter(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">Todas</option><option value="PUBLICO">Cardápio público</option><option value="TELEFONE">Telefone</option><option value="WHATSAPP">WhatsApp</option><option value="BALCAO">Balcão</option></select></label><label><span className="block text-xs font-bold text-slate-500">Rota / motoboy</span><select value={driverFilter} onChange={event => setDriverFilter(event.target.value)} className="mt-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm"><option value="">Todos</option>{motoboys.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label><label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={lateOnly} onChange={event => setLateOnly(event.target.checked)} className="accent-orange-600" /> Somente atrasados</label></section>
        <section className="flex min-h-[65vh] gap-3 overflow-x-auto pb-4">
          {LANES.map((lane) => {
            const laneOrders = active.filter(
              (item) => item.status === lane.status,
            );
            const Icon = lane.icon;
            return (
              <div key={lane.status} className="w-[290px] shrink-0">
                <header
                  className={`mb-2 flex items-center justify-between rounded-xl border-l-4 px-3 py-2 ${lane.tone}`}
                >
                  <span className="flex items-center gap-2 font-black text-slate-800">
                    <Icon size={17} /> {lane.label}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-600">
                    {laneOrders.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {laneOrders.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-base text-slate-950">
                            #{order.id} · {order.nomeDestinatario}
                          </strong>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {order.origem} · {elapsed(order.criadoEm)}
                          </p>
                        </div>
                        <strong className="text-sm text-slate-950">
                          {Number(order.total).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </strong>
                      </div>
                      <p className="mt-3 flex gap-1.5 text-sm text-slate-700">
                        <MapPin
                          size={15}
                          className="mt-0.5 shrink-0 text-orange-600"
                        />{" "}
                        <span>
                          {order.logradouro}, {order.numero || "s/n"} ·{" "}
                          {order.bairro}
                        </span>
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {order.comanda.pedidos
                          .flatMap((p) => p.itens)
                          .slice(0, 4)
                          .map((item) => (
                            <span
                              key={item.id}
                              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            >
                              {item.quantidade}× {item.produto.nome}
                            </span>
                          ))}
                      </div>
                      {order.motoboy && (
                        <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-violet-700">
                          <Bike size={14} /> {order.motoboy.nome}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => void transition(order)}
                        disabled={busyId === order.id}
                        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-xs font-black text-white hover:bg-orange-600 disabled:opacity-50"
                      >
                        {busyId === order.id && (
                          <LoaderCircle size={14} className="animate-spin" />
                        )}
                        {NEXT_LABEL[order.status]}
                      </button>
                    </article>
                  ))}
                  {!loading && laneOrders.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-400">
                      Nenhum pedido nesta etapa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
        {loading && orders.length === 0 && (
          <div className="fixed inset-0 grid place-items-center bg-white/50">
            <LoaderCircle className="animate-spin text-orange-600" />
          </div>
        )}
        {assigning && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-title"
          >
            <section className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <header className="flex items-start justify-between border-b border-slate-200 p-5">
                <div>
                  <h2
                    id="assign-title"
                    className="text-xl font-black text-slate-950"
                  >
                    Despachar pedido #{assigning.id}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Escolha quem fará esta entrega.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigning(null)}
                  aria-label="Fechar"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </header>
              <div className="p-5">
                <select
                  value={motoboyId}
                  onChange={(event) => setMotoboyId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="">Selecione um motoboy</option>
                  {motoboys
                    .filter((item) => item.status !== "INATIVO")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome} · {item.status}
                      </option>
                    ))}
                </select>
              </div>
              <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
                <button
                  type="button"
                  onClick={() => setAssigning(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void assign()}
                  disabled={!motoboyId || busyId === assigning.id}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  Atribuir e iniciar rota
                </button>
              </footer>
            </section>
          </div>
        )}
        <DeliveryAssistedOrderModal
          open={creating}
          onClose={() => setCreating(false)}
          onCreated={() => load(true)}
        />
      </div>
    </main>
  );
}

function elapsed(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}
