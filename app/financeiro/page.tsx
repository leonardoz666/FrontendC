"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  CircleDollarSign,
  LoaderCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { createIdempotencyKey } from "@/app/lib/offline";
import { useToast } from "@/contexts/ToastContext";
import { Modal } from "@/app/components/ui/Modal";
import { clearTenantDraft, readTenantDraft, readTenantPreference, readUrlViewState, replaceUrlViewState, writeTenantDraft, writeTenantPreference } from "@/app/lib/view-state";

type Account = {
  id: number;
  nome: string;
  saldo: number;
  entradas: number;
  saidas: number;
};
type Overview = {
  contas: Account[];
  totalContas: number;
  pagar: { vencidas: number; aberto: number };
  receber: { vencidas: number; aberto: number };
};
type Parcel = {
  id: number;
  numero: number;
  vencimento: string;
  valor: number;
  juros: number;
  multa: number;
  desconto: number;
  valorBaixado: number;
  status: string;
};
type Title = {
  id: number;
  tipo: "PAGAR" | "RECEBER";
  status: string;
  descricao: string;
  documento: string | null;
  competencia: string;
  valorTotal: number;
  fornecedor?: { nome: string } | null;
  cliente?: { nome: string } | null;
  planoConta: { nome: string; codigo: string | null };
  centroCusto?: { nome: string } | null;
  parcelas: Parcel[];
};
type Option = { id: number; nome: string; codigo?: string | null };
type Flow = {
  data: string;
  realizadoEntradas: number;
  realizadoSaidas: number;
  projetadoEntradas: number;
  projetadoSaidas: number;
};
type CreateForm = {
  tipo: "PAGAR" | "RECEBER";
  pessoaId: string;
  planoContaId: string;
  centroCustoId: string;
  descricao: string;
  documento: string;
  competencia: string;
  vencimento: string;
  valor: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const initialForm = (): CreateForm => ({
  tipo: "PAGAR",
  pessoaId: "",
  planoContaId: "",
  centroCustoId: "",
  descricao: "",
  documento: "",
  competencia: today(),
  vencimento: today(),
  valor: "",
});

const FINANCE_DEFAULTS_SCOPE = "novo-titulo-financeiro";
const FINANCE_DRAFT_SCOPE = "rascunho-titulo-financeiro";
type FinanceDefaults = Pick<CreateForm, "planoContaId" | "centroCustoId">;
const money = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const asList = <T,>(payload: T[] | { data: T[] }) =>
  Array.isArray(payload) ? payload : payload.data;

export default function FinancePage() {
  const { showToast } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [titles, setTitles] = useState<Title[]>([]);
  const [flow, setFlow] = useState<Flow[]>([]);
  const [tab, setTab] = useState<"PAGAR" | "RECEBER">("PAGAR");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [settling, setSettling] = useState<{
    title: Title;
    parcel: Parcel;
  } | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const state = readUrlViewState({ aba: "PAGAR" });
    if (state.aba === "PAGAR" || state.aba === "RECEBER") setTab(state.aba);
    setUrlReady(true);
  }, []);
  useEffect(() => {
    if (urlReady) replaceUrlViewState({ aba: tab });
  }, [tab, urlReady]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextOverview, nextTitles, nextFlow] = await Promise.all([
        apiFetch<Overview>("/financeiro/overview"),
        apiFetch<Title[]>(`/financeiro/titulos?tipo=${tab}`),
        apiFetch<Flow[]>("/financeiro/fluxo-caixa"),
      ]);
      setOverview(nextOverview);
      setTitles(nextTitles);
      setFlow(nextFlow);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o financeiro.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [showToast, tab]);
  useEffect(() => {
    void load();
  }, [load]);

  const dueSoon = useMemo(
    () =>
      titles
        .flatMap((title) => title.parcelas.map((parcel) => ({ title, parcel })))
        .filter((item) => ["ABERTA", "PARCIAL"].includes(item.parcel.status))
        .sort((a, b) => a.parcel.vencimento.localeCompare(b.parcel.vencimento))
        .slice(0, 8),
    [titles],
  );
  const maxFlow = Math.max(
    1,
    ...flow.flatMap((item) => [
      item.realizadoEntradas + item.projetadoEntradas,
      item.realizadoSaidas + item.projetadoSaidas,
    ]),
  );

  const approve = async (title: Title) => {
    try {
      await apiFetch(`/financeiro/titulos/${title.id}/aprovar`, {
        method: "POST",
      });
      showToast("Título aprovado.", "success");
      await load();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Não foi possível aprovar.",
        "error",
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Financeiro
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Títulos, caixa projetado e saldos bancários no mesmo razão.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTransferring(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800"
            >
              <ArrowRightLeft size={16} /> Transferir
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white shadow-sm shadow-orange-950/20"
            >
              <Plus size={17} /> Novo título
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid divide-y divide-slate-100 lg:grid-cols-[1.2fr_1fr_1fr] lg:divide-x lg:divide-y-0">
            <div className="bg-slate-950 p-5 text-white">
              <span className="text-sm font-bold text-slate-300">
                Saldo consolidado
              </span>
              <strong className="mt-2 block text-3xl font-black tabular-nums">
                {money(overview?.totalContas ?? 0)}
              </strong>
              <span className="mt-2 block text-xs text-slate-400">
                {overview?.contas.length ?? 0} contas ativas
              </span>
            </div>
            <BalanceBand
              label="A receber"
              value={overview?.receber.aberto ?? 0}
              overdue={overview?.receber.vencidas ?? 0}
              kind="in"
            />
            <BalanceBand
              label="A pagar"
              value={overview?.pagar.aberto ?? 0}
              overdue={overview?.pagar.vencidas ?? 0}
              kind="out"
            />
          </div>
          <div className="flex gap-5 overflow-x-auto border-t border-slate-100 px-5 py-3">
            {overview?.contas.map((account) => (
              <div key={account.id} className="min-w-40">
                <span className="block text-xs font-bold text-slate-500">
                  {account.nome}
                </span>
                <strong className="mt-1 block text-sm font-black text-slate-900">
                  {money(account.saldo)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-900">Pulso do mês</h2>
              <p className="text-xs text-slate-500">
                Realizado em cor sólida; compromissos futuros em tom claro.
              </p>
            </div>
            <button
              onClick={() => void load()}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
              aria-label="Atualizar"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="flex h-28 items-end gap-1 overflow-hidden">
            {flow.length === 0 ? (
              <div className="grid h-full w-full place-items-center text-sm text-slate-400">
                O fluxo aparece conforme os lançamentos são registrados.
              </div>
            ) : (
              flow.map((item) => (
                <div
                  key={item.data}
                  className="group flex min-w-3 flex-1 items-end gap-px"
                  title={`${shortDate(item.data)} — entradas ${money(item.realizadoEntradas + item.projetadoEntradas)}, saídas ${money(item.realizadoSaidas + item.projetadoSaidas)}`}
                >
                  <div
                    className="w-1/2 rounded-t bg-emerald-600"
                    style={{
                      height: `${Math.max(3, (item.realizadoEntradas / maxFlow) * 100)}%`,
                    }}
                  />
                  <div
                    className="w-1/2 rounded-t bg-rose-500"
                    style={{
                      height: `${Math.max(3, (item.realizadoSaidas / maxFlow) * 100)}%`,
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4">
              <div className="flex">
                <Tab active={tab === "PAGAR"} onClick={() => setTab("PAGAR")}>
                  Contas a pagar
                </Tab>
                <Tab
                  active={tab === "RECEBER"}
                  onClick={() => setTab("RECEBER")}
                >
                  Contas a receber
                </Tab>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {titles.length} títulos
              </span>
            </div>
            <div className="divide-y divide-slate-200 md:hidden">
              {titles.map((title) => {
                const parcel = title.parcelas.find((item) =>
                  ["ABERTA", "PARCIAL"].includes(item.status),
                );
                return (
                  <article key={title.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block break-words text-sm text-slate-900">
                          {title.descricao}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {title.fornecedor?.nome ?? title.cliente?.nome ?? "Sem pessoa vinculada"}
                        </span>
                      </div>
                      <Status value={title.status} />
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-xs font-semibold text-slate-500">Competência</dt><dd className="mt-0.5 text-slate-800">{shortDate(title.competencia)}</dd></div>
                      <div className="text-right"><dt className="text-xs font-semibold text-slate-500">Valor</dt><dd className="mt-0.5 font-black text-slate-950">{money(title.valorTotal)}</dd></div>
                    </dl>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className="min-w-0 truncate text-xs text-slate-500">{title.planoConta.nome}</span>
                      {title.status === "RASCUNHO" ? (
                        <button onClick={() => void approve(title)} className="min-h-10 rounded-lg bg-slate-950 px-4 text-xs font-black text-white">Aprovar</button>
                      ) : parcel ? (
                        <button onClick={() => setSettling({ title, parcel })} className="min-h-10 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-800">Dar baixa</button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Pessoa</th>
                    <th className="px-4 py-3">Competência</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {titles.map((title) => (
                    <tr key={title.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <strong className="block text-slate-900">
                          {title.descricao}
                        </strong>
                        <span className="text-xs text-slate-500">
                          {title.planoConta.codigo
                            ? `${title.planoConta.codigo} · `
                            : ""}
                          {title.planoConta.nome}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {title.fornecedor?.nome ?? title.cliente?.nome ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {shortDate(title.competencia)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">
                        {money(title.valorTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <Status value={title.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {title.status === "RASCUNHO" ? (
                          <button
                            onClick={() => void approve(title)}
                            className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white"
                          >
                            Aprovar
                          </button>
                        ) : (
                          (() => {
                            const parcel = title.parcelas.find((item) =>
                              ["ABERTA", "PARCIAL"].includes(item.status),
                            );
                            return parcel ? (
                              <button
                                onClick={() => setSettling({ title, parcel })}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800"
                              >
                                Dar baixa
                              </button>
                            ) : null;
                          })()
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && titles.length === 0 && (
              <div className="py-16 text-center">
                <CircleDollarSign
                  className="mx-auto text-slate-300"
                  size={36}
                />
                <h2 className="mt-3 font-black text-slate-800">
                  Nenhum título neste filtro
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Crie o primeiro lançamento para iniciar a projeção.
                </p>
              </div>
            )}
            {loading && titles.length === 0 && (
              <div className="grid h-48 place-items-center">
                <LoaderCircle className="animate-spin text-orange-600" />
              </div>
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-black text-slate-900">
                Próximos vencimentos
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Ordem de prioridade do filtro atual.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {dueSoon.map(({ title, parcel }) => {
                const remaining =
                  parcel.valor +
                  parcel.juros +
                  parcel.multa -
                  parcel.desconto -
                  parcel.valorBaixado;
                const late = new Date(parcel.vencimento) < new Date();
                return (
                  <button
                    key={parcel.id}
                    onClick={() => setSettling({ title, parcel })}
                    className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-slate-50"
                  >
                    <span>
                      <strong className="line-clamp-1 block text-sm text-slate-900">
                        {title.descricao}
                      </strong>
                      <small
                        className={
                          late ? "font-bold text-rose-600" : "text-slate-500"
                        }
                      >
                        {shortDate(parcel.vencimento)}
                        {late ? " · vencido" : ""}
                      </small>
                    </span>
                    <strong className="whitespace-nowrap text-sm text-slate-900">
                      {money(remaining)}
                    </strong>
                  </button>
                );
              })}
              {dueSoon.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-400">
                  Nada pendente neste filtro.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
      {creating && (
        <CreateTitleModal
          onClose={() => setCreating(false)}
          onSaved={async () => {
            setCreating(false);
            await load();
          }}
        />
      )}
      {settling && overview && (
        <SettlementModal
          item={settling}
          accounts={overview.contas}
          onClose={() => setSettling(null)}
          onSaved={async () => {
            setSettling(null);
            await load();
          }}
        />
      )}
      {transferring && overview && (
        <TransferModal
          accounts={overview.contas}
          onClose={() => setTransferring(false)}
          onSaved={async () => {
            setTransferring(false);
            await load();
          }}
        />
      )}
    </main>
  );
}

function BalanceBand({
  label,
  value,
  overdue,
  kind,
}: {
  label: string;
  value: number;
  overdue: number;
  kind: "in" | "out";
}) {
  const Icon = kind === "in" ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-center justify-between p-5">
      <div>
        <span className="text-sm font-bold text-slate-500">{label}</span>
        <strong
          className={`mt-2 block text-2xl font-black ${kind === "in" ? "text-emerald-700" : "text-rose-700"}`}
        >
          {money(value)}
        </strong>
        <small
          className={overdue ? "font-bold text-rose-600" : "text-slate-400"}
        >
          {overdue
            ? `${overdue} vencida${overdue > 1 ? "s" : ""}`
            : "Sem vencidos"}
        </small>
      </div>
      <Icon className={kind === "in" ? "text-emerald-500" : "text-rose-500"} />
    </div>
  );
}
function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-4 text-sm font-black ${active ? "border-orange-600 text-slate-950" : "border-transparent text-slate-400"}`}
    >
      {children}
    </button>
  );
}
function Status({ value }: { value: string }) {
  const style =
    value === "QUITADO"
      ? "bg-emerald-100 text-emerald-800"
      : value === "CANCELADO"
        ? "bg-rose-100 text-rose-800"
        : value === "RASCUNHO"
          ? "bg-slate-100 text-slate-700"
          : "bg-amber-100 text-amber-800";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${style}`}>
      {value.replaceAll("_", " ").toLocaleLowerCase("pt-BR")}
    </span>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal open onClose={onClose} title={title} size="lg">
      {children}
    </Modal>
  );
}
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label>
    <span className="mb-1.5 block text-xs font-bold text-slate-600">
      {label}
    </span>
    {children}
  </label>
);
const inputClass =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

function CreateTitleModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [options, setOptions] = useState<{
    people: Option[];
    plans: Option[];
    costs: Option[];
  }>({ people: [], plans: [], costs: [] });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const draft = readTenantDraft<Partial<CreateForm>>(FINANCE_DRAFT_SCOPE);
    if (draft) setForm((current) => ({ ...current, ...draft }));
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasContent = Boolean(form.pessoaId || form.descricao.trim() || form.documento.trim() || form.valor);
      if (hasContent) writeTenantDraft(FINANCE_DRAFT_SCOPE, form);
      else clearTenantDraft(FINANCE_DRAFT_SCOPE);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form]);
  useEffect(() => {
    const load = async () => {
      try {
        const [people, plans, costs] = await Promise.all([
          apiFetch<Option[] | { data: Option[] }>(
            form.tipo === "PAGAR"
              ? "/fornecedores?ativo=true&pageSize=100"
              : "/clientes?ativo=true&pageSize=100",
          ),
          apiFetch<Option[] | { data: Option[] }>(
            "/plano-contas?ativo=true&pageSize=200",
          ),
          apiFetch<Option[] | { data: Option[] }>(
            "/centros-custo?ativo=true&pageSize=100",
          ),
        ]);
        const nextPlans = asList(plans);
        const nextCosts = asList(costs);
        setOptions({ people: asList(people), plans: nextPlans, costs: nextCosts });
        const remembered = readTenantPreference<FinanceDefaults>(FINANCE_DEFAULTS_SCOPE);
        setForm((current) => ({
          ...current,
          planoContaId: current.planoContaId || (remembered && nextPlans.some((item) => String(item.id) === remembered.planoContaId) ? remembered.planoContaId : nextPlans.length === 1 ? String(nextPlans[0].id) : ""),
          centroCustoId: current.centroCustoId || (remembered && nextCosts.some((item) => String(item.id) === remembered.centroCustoId) ? remembered.centroCustoId : nextCosts.length === 1 ? String(nextCosts[0].id) : ""),
        }));
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os cadastros.",
          "error",
        );
      }
    };
    void load();
  }, [form.tipo, showToast]);
  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/financeiro/titulos", {
        method: "POST",
        body: {
          tipo: form.tipo,
          [form.tipo === "PAGAR" ? "fornecedorId" : "clienteId"]: Number(
            form.pessoaId,
          ),
          planoContaId: Number(form.planoContaId),
          centroCustoId: form.centroCustoId ? Number(form.centroCustoId) : null,
          descricao: form.descricao,
          documento: form.documento || null,
          competencia: `${form.competencia}T12:00:00`,
          parcelas: [
            {
              vencimento: `${form.vencimento}T12:00:00`,
              valor: Number(form.valor),
            },
          ],
        },
      });
      showToast("Título criado como rascunho.", "success");
      writeTenantPreference<FinanceDefaults>(FINANCE_DEFAULTS_SCOPE, {
        planoContaId: form.planoContaId,
        centroCustoId: form.centroCustoId,
      });
      clearTenantDraft(FINANCE_DRAFT_SCOPE);
      await onSaved();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o título.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell title="Novo título" onClose={onClose}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Natureza">
          <select
            className={inputClass}
            value={form.tipo}
            onChange={(event) =>
              setForm({
                ...form,
                tipo: event.target.value as CreateForm["tipo"],
                pessoaId: "",
              })
            }
          >
            <option value="PAGAR">Conta a pagar</option>
            <option value="RECEBER">Conta a receber</option>
          </select>
        </Field>
        <Field label={form.tipo === "PAGAR" ? "Fornecedor" : "Cliente"}>
          <select
            className={inputClass}
            value={form.pessoaId}
            onChange={(event) =>
              setForm({ ...form, pessoaId: event.target.value })
            }
          >
            <option value="">Selecione</option>
            {options.people.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descrição">
            <input
              className={inputClass}
              value={form.descricao}
              onChange={(event) =>
                setForm({ ...form, descricao: event.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Plano de conta">
          <select
            className={inputClass}
            value={form.planoContaId}
            onChange={(event) =>
              setForm({ ...form, planoContaId: event.target.value })
            }
          >
            <option value="">Selecione</option>
            {options.plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.codigo ? `${item.codigo} · ` : ""}
                {item.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Centro de custo">
          <select
            className={inputClass}
            value={form.centroCustoId}
            onChange={(event) =>
              setForm({ ...form, centroCustoId: event.target.value })
            }
          >
            <option value="">Sem centro</option>
            {options.costs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Documento">
          <input
            className={inputClass}
            value={form.documento}
            onChange={(event) =>
              setForm({ ...form, documento: event.target.value })
            }
          />
        </Field>
        <Field label="Valor">
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={inputClass}
            value={form.valor}
            onChange={(event) =>
              setForm({ ...form, valor: event.target.value })
            }
          />
        </Field>
        <Field label="Competência">
          <input
            type="date"
            className={inputClass}
            value={form.competencia}
            onChange={(event) =>
              setForm({ ...form, competencia: event.target.value })
            }
          />
        </Field>
        <Field label="Vencimento">
          <input
            type="date"
            className={inputClass}
            value={form.vencimento}
            onChange={(event) =>
              setForm({ ...form, vencimento: event.target.value })
            }
          />
        </Field>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
        <button
          onClick={onClose}
          className="h-11 rounded-xl px-4 text-sm font-bold text-slate-600"
        >
          Cancelar
        </button>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}{" "}
          Criar título
        </button>
      </footer>
    </ModalShell>
  );
}

function SettlementModal({
  item,
  accounts,
  onClose,
  onSaved,
}: {
  item: { title: Title; parcel: Parcel };
  accounts: Account[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const remaining =
    item.parcel.valor +
    item.parcel.juros +
    item.parcel.multa -
    item.parcel.desconto -
    item.parcel.valorBaixado;
  const [accountId, setAccountId] = useState(String(accounts[0]?.id ?? ""));
  const [value, setValue] = useState(String(remaining));
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/financeiro/parcelas/${item.parcel.id}/baixas`, {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey() },
        body: { contaBancariaId: Number(accountId), valor: Number(value) },
      });
      showToast("Baixa registrada.", "success");
      await onSaved();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a baixa.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell title="Dar baixa" onClose={onClose}>
      <div className="space-y-4 p-5">
        <div className="rounded-xl bg-slate-50 p-4">
          <strong className="block text-slate-950">
            {item.title.descricao}
          </strong>
          <span className="mt-1 block text-sm text-slate-500">
            Parcela {item.parcel.numero} · saldo {money(remaining)}
          </span>
        </div>
        <Field label="Conta bancária">
          <select
            className={inputClass}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nome} · {money(account.saldo)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valor da baixa">
          <input
            type="number"
            min="0.01"
            max={remaining}
            step="0.01"
            className={inputClass}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </Field>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
        <button
          onClick={onClose}
          className="h-11 px-4 text-sm font-bold text-slate-600"
        >
          Cancelar
        </button>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}{" "}
          Confirmar baixa
        </button>
      </footer>
    </ModalShell>
  );
}

function TransferModal({
  accounts,
  onClose,
  onSaved,
}: {
  accounts: Account[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState(String(accounts[0]?.id ?? ""));
  const [destination, setDestination] = useState(String(accounts[1]?.id ?? ""));
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await apiFetch("/financeiro/transferencias", {
        method: "POST",
        headers: { "Idempotency-Key": createIdempotencyKey() },
        body: {
          origemId: Number(origin),
          destinoId: Number(destination),
          valor: Number(value),
        },
      });
      showToast("Transferência registrada nos dois lados.", "success");
      await onSaved();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Não foi possível transferir.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <ModalShell title="Transferir entre contas" onClose={onClose}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Sai de">
          <select
            className={inputClass}
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Entra em">
          <select
            className={inputClass}
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nome}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Valor">
            <input
              type="number"
              min="0.01"
              step="0.01"
              className={inputClass}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
        </div>
      </div>
      <footer className="flex justify-end gap-2 border-t border-slate-200 p-4">
        <button
          onClick={onClose}
          className="h-11 px-4 text-sm font-bold text-slate-600"
        >
          Cancelar
        </button>
        <button
          disabled={saving}
          onClick={() => void save()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <ArrowRightLeft size={16} />
          )}{" "}
          Transferir
        </button>
      </footer>
    </ModalShell>
  );
}
